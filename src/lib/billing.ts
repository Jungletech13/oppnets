import { supabase } from './supabase';

export interface BillingCatalogItem {
  priceKey: string;
  displayName: string;
  productType: 'plan' | 'addon';
  planSlug: string | null;
  amountCents: number;
  billingInterval: 'one_time' | 'monthly' | 'yearly';
}

export interface PricingPlanView {
  slug: string;
  name: string;
  description: string;
  prices: Partial<Record<'monthly' | 'yearly', BillingCatalogItem>>;
  features: { label: string; included: boolean }[];
}

function entitlementIncluded(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  const numeric = Number(normalized);
  return Number.isNaN(numeric) ? normalized.length > 0 : numeric > 0;
}

function entitlementLabel(row: Record<string, unknown>) {
  const label = (row.label as string) || (row.key as string) || 'Plan feature';
  const value = String(row.value ?? '');
  return row.category === 'limits' && /^\d+$/.test(value) ? `${value} ${label.toLowerCase()}` : label;
}

export async function fetchPricingCatalog(): Promise<{ plans: PricingPlanView[]; addOns: BillingCatalogItem[] }> {
  const [pricesResult, plansResult, entitlementsResult] = await Promise.all([
    supabase.from('billing_price_catalog').select('*').eq('active', true).order('amount_cents'),
    supabase.from('subscription_plans').select('*').order('sort_order'),
    supabase.from('plan_entitlements').select('*').order('sort_order'),
  ]);
  if (pricesResult.error) throw pricesResult.error;
  if (plansResult.error) throw plansResult.error;
  if (entitlementsResult.error) throw entitlementsResult.error;

  const prices: BillingCatalogItem[] = (pricesResult.data ?? []).map((row) => ({
    priceKey: row.price_key as string,
    displayName: row.display_name as string,
    productType: row.product_type as BillingCatalogItem['productType'],
    planSlug: (row.plan_slug as string) || null,
    amountCents: row.amount_cents as number,
    billingInterval: row.billing_interval as BillingCatalogItem['billingInterval'],
  }));
  const planPrices = prices.filter((price) => price.productType === 'plan');
  const addOns = prices.filter((price) => price.productType === 'addon');

  const plans = (plansResult.data ?? [])
    .map((row) => {
      const slug = ((row.tier ?? row.slug) as string) || '';
      const matchingPrices = planPrices.filter((price) => price.planSlug === slug);
      return {
        slug,
        name: row.name as string,
        description: (row.description as string) || '',
        prices: Object.fromEntries(matchingPrices.map((price) => [price.billingInterval, price])),
        features: (entitlementsResult.data ?? [])
          .filter((entitlement) => (entitlement.plan_tier ?? entitlement.plan_slug) === slug)
          .map((entitlement) => ({
            label: entitlementLabel(entitlement as Record<string, unknown>),
            included: entitlementIncluded(String(entitlement.value ?? '')),
          })),
      } satisfies PricingPlanView;
    })
    .filter((plan) => plan.slug === 'builder-free' || Object.keys(plan.prices).length > 0);

  return { plans, addOns };
}

export async function startCheckout(priceKey: string, quantity = 1) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceKey, quantity },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Stripe did not return a checkout page.');
  window.location.assign(data.url);
}

