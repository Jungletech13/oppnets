import { useState, useEffect } from 'react';
import {
  CreditCard, Settings, Users, DollarSign, AlertCircle, Save, Check,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge, Modal, EmptyState } from '@/components/ui';
import { formatPrice, DRAFT_NOTICE } from '@/lib/entitlements';
import type {
  SubscriptionPlan,
  PlanEntitlements,
  UserSubscription,
  SubscriptionCostFactor,
} from '@/types';
import {
  fetchAllPlans, fetchAllEntitlements, fetchAllSubscriptions, fetchCostFactors,
  adminUpdatePlan, adminUpdateEntitlements,
} from '@/lib/subscription-queries';

type PlanRow = SubscriptionPlan;
type EntitlementRow = PlanEntitlements;
type SubscriptionRow = UserSubscription;
type CostFactorRow = SubscriptionCostFactor;

type Tab = 'plans' | 'entitlements' | 'subscriptions' | 'costs';

export function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [costFactors, setCostFactors] = useState<CostFactorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, e, s, c] = await Promise.all([
          fetchAllPlans(),
          fetchAllEntitlements(),
          fetchAllSubscriptions(),
          fetchCostFactors(),
        ]);
        setPlans(p);
        setEntitlements(e);
        setSubscriptions(s);
        setCostFactors(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Subscription Management" subtitle="Configure plans, entitlements, and pricing (DRAFT)" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-ink-500">Loading subscription data…</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Subscription Management" subtitle="Configure plans, entitlements, and pricing" />

      {/* Draft notice */}
      <Card className="p-3 mb-4 border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{DRAFT_NOTICE}</p>
        </div>
        <p className="text-xs text-amber-700 mt-1">
          All pricing and limits are draft values. No payment processing is active.
          Changes are audit-logged.
        </p>
      </Card>

      {error && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1">Dismiss</button>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-ink-200 overflow-x-auto">
        {([
          { key: 'plans', label: 'Plans', icon: CreditCard },
          { key: 'entitlements', label: 'Entitlements', icon: Settings },
          { key: 'subscriptions', label: 'Subscriptions', icon: Users },
          { key: 'costs', label: 'Unit Economics', icon: DollarSign },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'plans' && <PlansTab plans={plans} onError={setError} />}
      {tab === 'entitlements' && <EntitlementsTab entitlements={entitlements} plans={plans} onError={setError} />}
      {tab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} plans={plans} />}
      {tab === 'costs' && <CostsTab costFactors={costFactors} />}
    </div>
  );
}

// ============ Plans Tab ============

function PlansTab({ plans, onError }: { plans: PlanRow[]; onError: (msg: string) => void }) {
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [form, setForm] = useState<Partial<PlanRow>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function startEdit(plan: PlanRow) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      price_cents: plan.price_cents,
      billing_interval: plan.billing_interval,
      visibility: plan.visibility,
      active: plan.active,
      sort_order: plan.sort_order,
      approval_status: plan.approval_status,
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await adminUpdatePlan(editing.id, form);
      setSaved(true);
      setTimeout(() => { setEditing(null); setSaved(false); }, 1000);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Card className="overflow-hidden">
        {plans.length === 0 ? (
          <EmptyState icon={<CreditCard className="w-5 h-5" />} title="No plans" description="No subscription plans configured." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Price</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Interval</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Visibility</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Approval</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-800">{p.name}</div>
                    <div className="text-xs text-ink-400">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.plan_category}</td>
                  <td className="px-4 py-3 font-medium text-ink-800">{formatPrice(p.price_cents)}</td>
                  <td className="px-4 py-3 text-ink-600">{p.billing_interval}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.visibility === 'public' ? 'accent' : 'neutral'}>{p.visibility}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.approval_status === 'founder_approved' ? 'accent' : p.approval_status === 'retired' ? 'red' : 'amber'}>{p.approval_status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.active ? 'accent' : 'red'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(p)} className="btn-ghost text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Plan Configuration">
        {editing && (
          <div className="space-y-4">
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 font-medium">
              {DRAFT_NOTICE}
            </div>
            <div>
              <label className="label">Plan Name</label>
              <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px]" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Price (cents)</label>
                <input type="number" className="input" value={form.price_cents ?? 0} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Billing Interval</label>
                <select className="input" value={form.billing_interval ?? 'monthly'} onChange={(e) => setForm({ ...form, billing_interval: e.target.value as 'monthly' | 'yearly' })}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Visibility</label>
                <select className="input" value={form.visibility ?? 'public'} onChange={(e) => setForm({ ...form, visibility: e.target.value as 'public' | 'hidden' })}>
                  <option value="public">Public</option>
                  <option value="hidden">Hidden (Draft)</option>
                </select>
              </div>
              <div>
                <label className="label">Sort Order</label>
                <input type="number" className="input" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="label">Approval Status</label>
              <select className="input" value={form.approval_status ?? 'draft'} onChange={(e) => setForm({ ...form, approval_status: e.target.value as 'draft' | 'founder_approved' | 'retired' })}>
                <option value="draft">Draft — Not Founder Approved</option>
                <option value="founder_approved">Founder Approved</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <label htmlFor="active" className="text-sm text-ink-700">Plan is active</label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-ink-200">
              {saved ? (
                <span className="flex items-center gap-1 text-sm text-accent-600"><Check className="w-4 h-4" /> Saved</span>
              ) : (
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============ Entitlements Tab ============

function EntitlementsTab({ entitlements, plans, onError }: { entitlements: EntitlementRow[]; plans: PlanRow[]; onError: (msg: string) => void }) {
  const [editing, setEditing] = useState<EntitlementRow | null>(null);
  const [form, setForm] = useState<Partial<EntitlementRow>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function planName(planId: string): string {
    return plans.find((p) => p.id === planId)?.name ?? planId.slice(0, 8);
  }

  function startEdit(ent: EntitlementRow) {
    setEditing(ent);
    setForm({ ...ent });
    setSaved(false);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const updates: Partial<PlanEntitlements> = { ...form };
      delete updates.id;
      delete updates.plan_id;
      await adminUpdateEntitlements(editing.id, updates);
      setSaved(true);
      setTimeout(() => { setEditing(null); setSaved(false); }, 1000);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save entitlements');
    } finally {
      setSaving(false);
    }
  }

  const numericFields: { key: keyof EntitlementRow; label: string }[] = [
    { key: 'max_opportunities', label: 'Max Opportunities' },
    { key: 'max_applications', label: 'Max Applications' },
    { key: 'max_saved_items', label: 'Max Saved Items' },
    { key: 'max_collaboration_spaces', label: 'Max Collaboration Spaces' },
    { key: 'max_team_members', label: 'Max Team Members' },
    { key: 'max_messages_per_day', label: 'Max Messages/Day' },
    { key: 'storage_limit_mb', label: 'Storage (MB)' },
    { key: 'max_professional_listings', label: 'Max Professional Listings' },
    { key: 'max_company_pages', label: 'Max Company Pages' },
  ];

  const booleanFields: { key: keyof EntitlementRow; label: string }[] = [
    { key: 'ai_access', label: 'AI Access' },
    { key: 'advanced_search', label: 'Advanced Search' },
    { key: 'analytics_access', label: 'Analytics' },
    { key: 'priority_visibility', label: 'Priority Visibility' },
    { key: 'sponsored_listing_access', label: 'Sponsored Listings' },
    { key: 'recruiting_tools', label: 'Recruiting Tools' },
    { key: 'marketing_tools', label: 'Marketing Tools' },
    { key: 'public_builder_profile', label: 'Public Builder Profile' },
    { key: 'seo_profile', label: 'SEO Profile' },
  ];

  return (
    <div>
      <Card className="overflow-hidden">
        {entitlements.length === 0 ? (
          <EmptyState icon={<Settings className="w-5 h-5" />} title="No entitlements" description="No plan entitlements configured." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">AI</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Analytics</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Max Opps</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Max Spaces</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {entitlements.map((e) => (
                <tr key={e.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink-800">{planName(e.plan_id)}</td>
                  <td className="px-4 py-3">{e.ai_access ? <Badge tone="accent">Yes</Badge> : <Badge tone="neutral">No</Badge>}</td>
                  <td className="px-4 py-3">{e.analytics_access ? <Badge tone="accent">Yes</Badge> : <Badge tone="neutral">No</Badge>}</td>
                  <td className="px-4 py-3 text-ink-600">{e.max_opportunities}</td>
                  <td className="px-4 py-3 text-ink-600">{e.max_collaboration_spaces}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(e)} className="btn-ghost text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Entitlements" wide>
        {editing && (
          <div className="space-y-4">
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 font-medium">
              {DRAFT_NOTICE}
            </div>
            <div className="font-medium text-ink-800">{planName(editing.plan_id)}</div>

            <div>
              <h4 className="text-sm font-semibold text-ink-700 mb-2">Numeric Limits</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {numericFields.map((f) => (
                  <div key={f.key}>
                    <label className="label text-xs">{f.label}</label>
                    <input
                      type="number"
                      className="input"
                      value={form[f.key] as number ?? 0}
                      onChange={(e) => setForm({ ...form, [f.key]: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-ink-700 mb-2">Feature Flags</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {booleanFields.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={form[f.key] as boolean ?? false}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-ink-200">
              {saved ? (
                <span className="flex items-center gap-1 text-sm text-accent-600"><Check className="w-4 h-4" /> Saved</span>
              ) : (
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============ Subscriptions Tab ============

function SubscriptionsTab({ subscriptions, plans }: { subscriptions: SubscriptionRow[]; plans: PlanRow[] }) {
  function planName(planId: string): string {
    return plans.find((p) => p.id === planId)?.name ?? planId.slice(0, 8);
  }

  return (
    <div>
      <Card className="overflow-hidden">
        {subscriptions.length === 0 ? (
          <EmptyState icon={<Users className="w-5 h-5" />} title="No subscriptions" description="No user subscriptions have been assigned yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Started</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{s.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-medium text-ink-800">{planName(s.plan_id)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={
                      s.status === 'active' ? 'accent' :
                      s.status === 'trial' ? 'brand' :
                      s.status === 'free' ? 'neutral' :
                      s.status === 'past_due' ? 'amber' :
                      s.status === 'cancelled' ? 'red' : 'neutral'
                    }>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">
                    {new Date(s.started_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ============ Costs Tab ============

function CostsTab({ costFactors }: { costFactors: CostFactorRow[] }) {
  return (
    <div>
      <Card className="p-5">
        <h3 className="section-title mb-1">Unit Economics Preparation</h3>
        <p className="text-sm text-ink-500 mb-4">
          Monthly cost estimates for future profitability analysis. {DRAFT_NOTICE}
        </p>

        {costFactors.length === 0 ? (
          <EmptyState icon={<DollarSign className="w-5 h-5" />} title="No cost factors" description="No cost factors configured." />
        ) : (
          <div className="space-y-2">
            {costFactors.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-ink-50 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink-800 capitalize">{c.cost_category}</div>
                  <div className="text-xs text-ink-400">{c.description}</div>
                </div>
                <div className="text-sm font-semibold text-ink-800">{formatPrice(c.monthly_cost_cents)}/mo</div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-ink-200">
              <span className="text-sm font-semibold text-ink-700">Total Monthly Cost (DRAFT)</span>
              <span className="text-lg font-bold text-ink-900">
                {formatPrice(costFactors.reduce((sum, c) => sum + c.monthly_cost_cents, 0))}
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-ink-100">
          <p className="text-xs text-ink-400">
            Gross margin targets and per-user economics will be calculated once founder approves
            pricing and cost assumptions. No final economics are computed yet.
          </p>
        </div>
      </Card>
    </div>
  );
}
