import { PageHeader } from '@/components/AppShell';
import { Card, Badge } from '@/components/ui';
import { Check, X, Sparkles } from 'lucide-react';
import { PRICING_PLANS } from '@/data-phase2';
import { useMembership } from '@/lib/use-membership';

export function PricingPage() {
  const { plan: currentPlan, loading } = useMembership();

  return (
    <div>
      <PageHeader title="Pricing" subtitle="Start free. Upgrade when you need more. Every plan strengthens the mission: every connection should lead to an opportunity." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRICING_PLANS.map((plan) => (
          <Card key={plan.tier} className={`p-5 flex flex-col ${plan.highlighted ? 'border-brand-400 border-2 ring-2 ring-brand-100' : ''}`}>
            {plan.highlighted && (
              <div className="flex items-center gap-1 text-xs text-brand-600 font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Most popular
              </div>
            )}
            <h3 className="text-sm font-semibold text-ink-900">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-1">
              <span className="text-2xl font-bold text-ink-900">{plan.price}</span>
              <span className="text-xs text-ink-500">/{plan.period}</span>
            </div>
            <p className="text-xs text-ink-500 mb-4">{plan.description}</p>

            <div className="space-y-2 flex-1 mb-4">
              {plan.features.map((f) => (
                <div key={f.label} className="flex items-start gap-2 text-xs">
                  {f.included ? <Check className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-ink-300 shrink-0 mt-0.5" />}
                  <span className={f.included ? 'text-ink-700' : 'text-ink-400'}>{f.label}</span>
                </div>
              ))}
            </div>

            <button
              className={plan.highlighted && currentPlan?.slug !== plan.tier ? 'btn-primary w-full' : 'btn-secondary w-full'}
              disabled={loading || currentPlan?.slug === plan.tier}
            >
              {loading ? 'Checking plan...' : currentPlan?.slug === plan.tier ? 'Current plan' : plan.cta}
            </button>
          </Card>
        ))}
      </div>

      <Card className="p-5 mt-5">
        <p className="text-xs text-ink-500 text-center">
          Pricing architecture only â€” no payment processing yet. Plans will be available when billing is enabled.
        </p>
      </Card>
    </div>
  );
}

