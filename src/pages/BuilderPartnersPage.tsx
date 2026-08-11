import { useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Avatar, BetaNote } from '@/components/ui';
import { CheckCircle2 } from 'lucide-react';
import { BUILDER_PARTNERS } from '@/data-phase2';
import type { PartnerCategory } from '@/types';

const CATEGORIES: (PartnerCategory | 'All')[] = [
  'All', 'Banking', 'Accounting', 'Legal', 'Insurance', 'Payments',
  'Cloud Infrastructure', 'Productivity', 'CRM', 'Marketing', 'HR',
];

export function BuilderPartnersPage() {
  const [category, setCategory] = useState<PartnerCategory | 'All'>('All');

  const filtered = category === 'All' ? BUILDER_PARTNERS : BUILDER_PARTNERS.filter((p) => p.category === category);

  return (
    <div>
      <PageHeader title="Builder Resources" subtitle="Business-tool categories that may support a venture." />
      <div className="mb-5"><BetaNote>Resource categories only. Provider listings and member offers will appear only after they are reviewed and configured by OppNets.</BetaNote></div>

      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button aria-pressed={category === c} key={c} onClick={() => setCategory(c)} className={`min-h-11 text-xs rounded-full px-3 py-1.5 border transition-colors ${category === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}>{c}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <Avatar src={p.logoUrl} name={p.name} size={48} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink-900">{p.name}</h3>
                <Badge tone="neutral">{p.category}</Badge>
              </div>
            </div>
            <p className="text-xs text-ink-600 mb-3">{p.description}</p>
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Provider link and any member offer are not configured.
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
