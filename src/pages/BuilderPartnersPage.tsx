import { useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Avatar } from '@/components/ui';
import { Wrench, ExternalLink, CheckCircle2 } from 'lucide-react';
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
      <PageHeader title="Builder Partners" subtitle="Trusted business tools and services to help you build and grow your venture. Educational, not promotional." />

      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${category === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}>{c}</button>
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
            {p.offer && (
              <div className="flex items-start gap-1.5 text-xs text-accent-700 bg-accent-50 rounded-lg p-2 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {p.offer}
              </div>
            )}
            <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
