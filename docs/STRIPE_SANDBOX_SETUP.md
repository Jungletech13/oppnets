# Stripe sandbox setup

OppNets checkout is intentionally sandbox-only until the live Stripe account is verified and a separate production review is complete.

## 1. Create sandbox products and prices

Create Stripe sandbox prices for every row in `public.billing_price_catalog`. Use the exact amounts and intervals already stored in the table. Copy each resulting `price_...` identifier into its matching row's `stripe_price_id` column.

Do not place Stripe secret keys or webhook signing secrets in the browser, Git, Cloudflare Pages variables, or this table.

## 2. Configure Supabase function secrets

Set these secrets for the linked Supabase project:

- `STRIPE_SECRET_KEY`: the Stripe sandbox secret key beginning with `sk_test_`
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the OppNets Stripe webhook beginning with `whsec_`
- `PUBLIC_SITE_URL`: `https://oppnets.com`

Supabase already supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions.

## 3. Deploy the billing functions

Deploy:

- `create-checkout-session`
- `stripe-webhook`

The checkout function authenticates the OppNets user itself. The webhook function accepts unsigned-JWT requests from Stripe, then validates Stripe's signature before changing billing access.

## 4. Register the Stripe webhook

Use this endpoint:

`https://piodsfehlkyfzofcdacy.supabase.co/functions/v1/stripe-webhook`

Subscribe to these events for the current sandbox slice:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

## 5. Test before live activation

1. Sign into OppNets with a test user.
2. Open Pricing and select a sandbox plan or add-on.
3. Complete Stripe Checkout with a Stripe test card.
4. Confirm the Checkout success redirect returns to OppNets.
5. Confirm the event appears in `stripe_webhook_events`.
6. Confirm a plan updates `user_subscriptions`, or an add-on creates a `billing_purchases` row.
7. Repeat the webhook event and confirm fulfillment is idempotent.

Recurring invoice payments, refunds, and payment failures require additional webhook handlers before OppNets can accept live payments.

