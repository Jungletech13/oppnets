import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { Card } from '@/components/ui';
import { Check, X, Sparkles } from 'lucide-react';
import { useMembership } from '@/lib/use-membership';
import { fetchPricingCatalog, startCheckout, type BillingCatalogItem, type PricingPlanView } from '@/lib/billing';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function formatPrice(price: BillingCatalogItem | undefined) {
  return price ? currency.format(price.amountCents / 100) : '$0';
}

export function PricingPage() {
  const { plan: currentPlan, loading } = useMembership();
  const [yearly, setYearly] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [plans, setPlans] = useState<PricingPlanView[]>([]);
  const [addOns, setAddOns] = useState<BillingCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchPricingCatalog()
      .then((catalog) => {
        if (!active) return;
        setPlans(catalog.plans);
        setAddOns(catalog.addOns);
        setCatalogLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setCheckoutError(error instanceof Error ? error.message : 'Pricing could not be loaded.');
        setCatalogLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function checkout(priceKey: string) {
    setCheckoutError('');
    setStarting(priceKey);
    try {
      await startCheckout(priceKey);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout could not be started.');
      setStarting(null);
    }
  }

  return (
    <div>
      <PageHeader title="Pricing" subtitle="Start free. Upgrade when you need more. Every plan strengthens the mission: every connection should lead to an opportunity." />

      <div className="flex justify-center gap-2 mb-5" aria-label="Billing frequency">
        <button className={!yearly ? 'btn-primary' : 'btn-secondary'} onClick={() => setYearly(false)}>Monthly</button>
        <button className={yearly ? 'btn-primary' : 'btn-secondary'} onClick={() => setYearly(true)}>Yearly - save 2 months</button>
      </div>

      {checkoutError && (
        <div role="alert">
          <Card className="p-3 mb-4 border-red-200 text-sm text-red-700">{checkoutError}</Card>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {catalogLoading && <Card className="p-5 sm:col-span-2 lg:col-span-4 text-sm text-ink-500">Loading approved pricing...</Card>}
        {!catalogLoading && plans.map((plan) => {
          const isFree = plan.slug === 'builder-free';
          const selectedPrice = isFree ? undefined : plan.prices[yearly ? 'yearly' : 'monthly'];
          const priceKey = selectedPrice?.priceKey ?? '';
          const current = currentPlan?.slug === plan.slug;
          return (
            <Card key={plan.slug} className="p-5 flex flex-col">
              {plan.slug === 'builder-pro' && <div className="inline-flex self-start items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700 font-medium mb-2"><Sparkles className="w-3.5 h-3.5" /> Most popular</div>}
              <h3 className="text-sm font-semibold text-ink-900">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1 mb-1"><span className="text-2xl font-bold text-ink-900">{formatPrice(selectedPrice)}</span><span className="text-xs text-ink-500">/{isFree ? 'forever' : yearly ? 'year' : 'month'}</span></div>
              <p className="text-xs text-ink-500 mb-4">{plan.description}</p>
              <div className="space-y-2 flex-1 mb-4">
                {plan.features.map((feature) => <div key={feature.label} className="flex items-start gap-2 text-xs">{feature.included ? <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-ink-300 shrink-0 mt-0.5" />}<span className={feature.included ? 'text-ink-700' : 'text-ink-400'}>{feature.label}</span></div>)}
              </div>
              <button className="btn-secondary w-full" disabled={loading || current || isFree || !selectedPrice || starting !== null} onClick={() => checkout(priceKey)}>
                {loading ? 'Checking plan...' : current ? 'Current plan' : isFree ? 'Included' : starting === priceKey ? 'Opening Stripe...' : `Choose ${plan.name}`}
              </button>
            </Card>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold text-ink-900 mt-8 mb-3">One-time and optional add-ons</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {addOns.map((addOn) => <Card key={addOn.priceKey} className="p-4 flex flex-col"><h3 className="font-semibold text-ink-900">{addOn.displayName}</h3><p className="text-xs text-ink-500 mt-1 flex-1">Optional OppNets add-on</p><p className="text-xl font-bold text-ink-900 my-3">{formatPrice(addOn)}{addOn.billingInterval === 'monthly' ? '/mo' : ''}</p><button className="btn-secondary w-full" disabled={starting !== null} onClick={() => checkout(addOn.priceKey)}>{starting === addOn.priceKey ? 'Opening Stripe...' : 'Buy add-on'}</button></Card>)}
      </div>

      <Card className="p-5 mt-5"><p className="text-xs text-ink-500 text-center">Secure checkout is processed by Stripe. Sandbox mode must pass end-to-end testing before live payments are enabled.</p></Card>
    </div>
  );
}


