import { createClient } from 'npm:@supabase/supabase-js@2';

const encoder = new TextEncoder();

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return signatures.some((signature) => constantTimeEqual(expected, signature));
}

function requireNoError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

function toIsoDate(value: unknown) {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : null;
}

function mapSubscriptionStatus(status: string | undefined, deleted = false) {
  if (deleted) return 'cancelled';
  switch (status) {
    case 'trialing': return 'trial';
    case 'active': return 'active';
    case 'past_due':
    case 'unpaid': return 'past_due';
    case 'canceled': return 'cancelled';
    case 'incomplete_expired': return 'expired';
    default: return 'pending';
  }
}

type StripeEventObject = {
  id?: string;
  customer?: string | null;
  subscription?: string | null;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string | undefined> | null;
  status?: string;
  current_period_start?: number | null;
  current_period_end?: number | null;
  trial_end?: number | null;
  canceled_at?: number | null;
  items?: { data?: Array<{ price?: { id?: string } }> };
};

type StripeEvent = {
  id: string;
  type: string;
  livemode?: boolean;
  data: { object: StripeEventObject };
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Webhook is not configured' }, 500);
  }

  const signatureHeader = request.headers.get('stripe-signature');
  if (!signatureHeader) return jsonResponse({ error: 'Missing Stripe signature' }, 400);

  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, signatureHeader, signingSecret))) {
    return jsonResponse({ error: 'Invalid Stripe signature' }, 400);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  if (!event?.id || !event.type || !event.data?.object) {
    return jsonResponse({ error: 'Invalid Stripe event' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: priorEvent, error: priorEventError } = await supabase
      .from('stripe_webhook_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();
    requireNoError(priorEventError, 'Check webhook idempotency');
    if (priorEvent) return jsonResponse({ received: true, duplicate: true });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const priceKey = session.metadata?.price_key;
      const quantity = Number(session.metadata?.quantity ?? '1');
      if (!userId || !priceKey) throw new Error('Checkout session is missing billing metadata');

      const { error: customerError } = await supabase.from('billing_customers').upsert({
        user_id: userId,
        stripe_customer_id: session.customer,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      requireNoError(customerError, 'Save billing customer');

      const { data: catalog, error: catalogError } = await supabase
        .from('billing_price_catalog')
        .select('*')
        .eq('price_key', priceKey)
        .eq('active', true)
        .single();
      requireNoError(catalogError, 'Load billing catalog item');

      if (catalog.product_type === 'plan') {
        const { error: subscriptionError } = await supabase.from('user_subscriptions').upsert({
          user_id: userId,
          plan_tier: catalog.plan_slug,
          status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          billing_price_key: priceKey,
          current_period_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        requireNoError(subscriptionError, 'Activate subscription');
      } else {
        const { error: purchaseError } = await supabase.from('billing_purchases').upsert({
          user_id: userId,
          price_key: priceKey,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          status: 'paid',
          quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
          amount_cents: session.amount_total ?? catalog.amount_cents,
          currency: session.currency ?? 'usd',
          metadata: session.metadata ?? {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_checkout_session_id' });
        requireNoError(purchaseError, 'Record add-on purchase');
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      let userId = subscription.metadata?.user_id as string | undefined;
      let priceKey = subscription.metadata?.price_key as string | undefined;

      if (!userId || !priceKey) {
        const { data: existing, error: existingError } = await supabase
          .from('user_subscriptions')
          .select('user_id, billing_price_key')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();
        requireNoError(existingError, 'Find existing Stripe subscription');
        userId ??= existing?.user_id;
        priceKey ??= existing?.billing_price_key;
      }

      const stripePriceId = subscription.items?.data?.[0]?.price?.id;
      let planTier: string | undefined;
      if (priceKey || stripePriceId) {
        let catalogQuery = supabase
          .from('billing_price_catalog')
          .select('price_key, plan_slug');
        catalogQuery = priceKey
          ? catalogQuery.eq('price_key', priceKey)
          : catalogQuery.eq('stripe_price_id', stripePriceId);
        const { data: catalog, error: catalogError } = await catalogQuery.maybeSingle();
        requireNoError(catalogError, 'Resolve subscription catalog item');
        priceKey ??= catalog?.price_key;
        planTier = catalog?.plan_slug;
      }

      if (!userId) throw new Error('Stripe subscription is not linked to an OppNets user');

      const { error: updateError } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        ...(planTier ? { plan_tier: planTier } : {}),
        status: mapSubscriptionStatus(
          subscription.status,
          event.type === 'customer.subscription.deleted',
        ),
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        ...(priceKey ? { billing_price_key: priceKey } : {}),
        current_period_start: toIsoDate(subscription.current_period_start),
        current_period_end: toIsoDate(subscription.current_period_end),
        trial_ends_at: toIsoDate(subscription.trial_end),
        cancelled_at: toIsoDate(subscription.canceled_at),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      requireNoError(updateError, 'Update Stripe subscription');
    }

    const { error: eventError } = await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode === true,
      payload: event,
    });
    requireNoError(eventError, 'Record Stripe webhook event');

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed', error);
    return jsonResponse({ error: 'Webhook processing failed' }, 500);
  }
});

