import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await anon.auth.getUser();
    if (authError || !user) throw new Error('Sign in before starting checkout.');

    const { priceKey, quantity = 1 } = await req.json();
    if (!priceKey || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error('Invalid checkout request.');
    }

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: price, error: priceError } = await admin
      .from('billing_price_catalog')
      .select('price_key,product_type,billing_interval,stripe_price_id,active')
      .eq('price_key', priceKey)
      .single();
    if (priceError || !price?.active) throw new Error('That billing option is unavailable.');
    if (!price.stripe_price_id) {
      return Response.json({ error: 'Stripe sandbox price is not configured yet for this option.' }, { status: 409, headers: cors });
    }

    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret?.startsWith('sk_test_')) throw new Error('Stripe sandbox is not configured.');
    const site = (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://oppnets.com').replace(/\/$/, '');
    const form = new URLSearchParams({
      mode: price.billing_interval === 'one_time' ? 'payment' : 'subscription',
      'line_items[0][price]': price.stripe_price_id,
      'line_items[0][quantity]': String(quantity),
      success_url: `${site}/#/settings?checkout=success`,
      cancel_url: `${site}/#/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      'metadata[user_id]': user.id,
      'metadata[price_key]': price.price_key,
      'metadata[quantity]': String(quantity),
      'metadata[app]': 'oppnets',
      'metadata[environment]': 'sandbox',
      'metadata[catalog_version]': '0.4',
    });
    if (price.billing_interval !== 'one_time') {
      form.set('subscription_data[metadata][user_id]', user.id);
      form.set('subscription_data[metadata][price_key]', price.price_key);
    } else {
      form.set('customer_creation', 'always');
    }
    if (user.email) form.set('customer_email', user.email);

    const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const session = await stripe.json();
    if (!stripe.ok || !session.url) throw new Error(session.error?.message ?? 'Stripe could not start checkout.');
    return Response.json({ url: session.url }, { headers: cors });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Checkout failed.' }, { status: 400, headers: cors });
  }
});

