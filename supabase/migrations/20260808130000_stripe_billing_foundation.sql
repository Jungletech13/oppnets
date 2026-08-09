CREATE TABLE IF NOT EXISTS public.billing_price_catalog (
  price_key text PRIMARY KEY,
  display_name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('plan', 'addon')),
  plan_slug text REFERENCES public.subscription_plans(tier),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  billing_interval text NOT NULL CHECK (billing_interval IN ('one_time', 'monthly', 'yearly')),
  stripe_price_id text UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.billing_price_catalog
  (price_key, display_name, product_type, plan_slug, amount_cents, billing_interval, stripe_price_id)
VALUES
  ('builder-pro-monthly', 'Builder Pro monthly', 'plan', 'builder-pro', 1900, 'monthly', 'price_1U2MGo1xIwdmLTszJ5nsmQL9'),
  ('builder-pro-yearly', 'Builder Pro yearly', 'plan', 'builder-pro', 19000, 'yearly', 'price_1U2MLq1xIwdmLTszaFtzUAid'),
  ('professional-monthly', 'Professional monthly', 'plan', 'professional', 4900, 'monthly', 'price_1U2MOa1xIwdmLTszbkIzncty'),
  ('professional-yearly', 'Professional yearly', 'plan', 'professional', 49000, 'yearly', 'price_1U2MQ71xIwdmLTszUiNL2WAT'),
  ('company-monthly', 'Company monthly', 'plan', 'company', 9900, 'monthly', 'price_1U2MWh1xIwdmLTsziz7Fzugj'),
  ('company-yearly', 'Company yearly', 'plan', 'company', 99000, 'yearly', 'price_1U2MZk1xIwdmLTszx4c7WncJ'),
  ('company-seat-monthly', 'Additional company seat', 'addon', NULL, 1200, 'monthly', 'price_1U2MbV1xIwdmLTszyNmTgKMe'),
  ('company-seat-yearly', 'Additional company seat yearly', 'addon', NULL, 12000, 'yearly', 'price_1U2Mfs1xIwdmLTsz9BVNkOiz'),
  ('spotlight-7d', 'Opportunity Spotlight - 7 days', 'addon', NULL, 2900, 'one_time', 'price_1U2MhE1xIwdmLTszH3ZO9OCM'),
  ('spotlight-plus-30d', 'Opportunity Spotlight Plus - 30 days', 'addon', NULL, 6900, 'one_time', 'price_1U2Mn81xIwdmLTszq5rmitBW'),
  ('pro-listing-boost-30d', 'Professional Listing Boost - 30 days', 'addon', NULL, 3900, 'one_time', 'price_1U2MpV1xIwdmLTszrgRCE5IW'),
  ('extra-storage-25gb-monthly', 'Extra Storage - 25 GB', 'addon', NULL, 1000, 'monthly', 'price_1U2Mqx1xIwdmLTszA8FeufIk')
ON CONFLICT (price_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  product_type = EXCLUDED.product_type,
  plan_slug = EXCLUDED.plan_slug,
  amount_cents = EXCLUDED.amount_cents,
  billing_interval = EXCLUDED.billing_interval,
  stripe_price_id = EXCLUDED.stripe_price_id,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_key text NOT NULL REFERENCES public.billing_price_catalog(price_key),
  stripe_checkout_session_id text UNIQUE,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'cancelled', 'expired', 'refunded')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS billing_price_key text REFERENCES public.billing_price_catalog(price_key);

ALTER TABLE public.billing_price_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_catalog_public_read ON public.billing_price_catalog;
CREATE POLICY billing_catalog_public_read ON public.billing_price_catalog
  FOR SELECT TO authenticated USING (active = true);

DROP POLICY IF EXISTS billing_customers_own_read ON public.billing_customers;
CREATE POLICY billing_customers_own_read ON public.billing_customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS billing_purchases_own_read ON public.billing_purchases;
CREATE POLICY billing_purchases_own_read ON public.billing_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.billing_customers, public.billing_purchases, public.stripe_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.billing_price_catalog, public.billing_customers, public.billing_purchases TO authenticated;

COMMENT ON TABLE public.billing_price_catalog IS 'Approved OppNets catalog. Stripe Price IDs are configured after creating sandbox products.';
COMMENT ON TABLE public.stripe_webhook_events IS 'Idempotency ledger. Only the service role used by the Stripe webhook may write.';

