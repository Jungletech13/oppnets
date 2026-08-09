import { useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { Card } from '@/components/ui';
import { Check, X, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '@/data-phase2';
import { useMembership } from '@/lib/use-membership';
import { startCheckout } from '@/lib/billing';

const addOns = [
  { key: 'introduction-single', name: 'Verified Introduction', detail: 'Open one protected OppNets conversation', price: '$4' },
  { key: 'introduction-pack-5', name: 'Introduction Pack', detail: 'Open five protected OppNets conversations', price: '$15' },
  { key: 'spotlight-7d', name: 'Opportunity Spotlight', detail: 'Featured placement for 7 days', price: '$29' },
  { key: 'spotlight-plus-30d', name: 'Spotlight Plus', detail: 'Priority placement for 30 days', price: '$69' },
  { key: 'pro-listing-boost-30d', name: 'Professional Listing Boost', detail: 'Boost a professional listing for 30 days', price: '$39' },
  { key: 'extra-storage-25gb-monthly', name: 'Extra storage', detail: 'Add 25 GB to your account', price: '$10/mo' },
];

export function PricingPage() {
  const { plan: currentPlan, loading } = useMembership();
  const [yearly, setYearly] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

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
        {PRICING_PLANS.map((plan) => {
          const isFree = plan.tier === 'builder-free';
          const priceKey = isFree ? '' : `${plan.tier}-${yearly ? 'yearly' : 'monthly'}`;
          const prices: Record<string, [string, string]> = {
            'builder-pro': [yearly ? '$190' : '$19', yearly ? 'year' : 'month'],
            professional: [yearly ? '$490' : '$49', yearly ? 'year' : 'month'],
            company: [yearly ? '$990' : '$99', yearly ? 'year' : 'month'],
          };
          const display = prices[plan.tier] ?? [plan.price, plan.period];
          const current = currentPlan?.slug === plan.tier;
          return (
            <Card key={plan.tier} className="p-5 flex flex-col">
              {plan.highlighted && <div className="inline-flex self-start items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700 font-medium mb-2"><Sparkles className="w-3.5 h-3.5" /> Most popular</div>}
              <h3 className="text-sm font-semibold text-ink-900">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1 mb-1"><span className="text-2xl font-bold text-ink-900">{display[0]}</span><span className="text-xs text-ink-500">/{display[1]}</span></div>
              <p className="text-xs text-ink-500 mb-4">{plan.description}</p>
              <div className="space-y-2 flex-1 mb-4">
                {plan.features.map((feature) => <div key={feature.label} className="flex items-start gap-2 text-xs">{feature.included ? <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-ink-300 shrink-0 mt-0.5" />}<span className={feature.included ? 'text-ink-700' : 'text-ink-400'}>{feature.label}</span></div>)}
              </div>
              <button className="btn-secondary w-full" disabled={loading || current || isFree || starting !== null} onClick={() => checkout(priceKey)}>
                {loading ? 'Checking plan...' : current ? 'Current plan' : isFree ? 'Included' : starting === priceKey ? 'Opening Stripe...' : `Choose ${plan.name}`}
              </button>
            </Card>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold text-ink-900 mt-8 mb-3">One-time and optional add-ons</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {addOns.map((addOn) => <Card key={addOn.key} className="p-4 flex flex-col"><h3 className="font-semibold text-ink-900">{addOn.name}</h3><p className="text-xs text-ink-500 mt-1 flex-1">{addOn.detail}</p><p className="text-xl font-bold text-ink-900 my-3">{addOn.price}</p><button className="btn-secondary w-full" disabled={starting !== null} onClick={() => checkout(addOn.key)}>{starting === addOn.key ? 'Opening Stripe...' : 'Buy add-on'}</button></Card>)}
      </div>

      <Card className="p-5 mt-5"><p className="text-xs text-ink-500 text-center">Secure checkout is processed by Stripe. Sandbox mode must pass end-to-end testing before live payments are enabled.</p></Card>
    </div>
  );
}


