import { useState, useMemo } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Badge, EmptyState } from '@/components/ui';
import { Compass, SlidersHorizontal, ShieldCheck, Search } from 'lucide-react';
import type { OpportunityStage, Compensation, Industry } from '@/types';

const CATEGORIES: Industry[] = ['Real Estate', 'Cleaning & Services', 'Nonprofit', 'Technology', 'Film & Media', 'E-commerce', 'Food & Restaurant', 'Finance', 'Consulting', 'Community', 'Creative'];
const STAGES: OpportunityStage[] = ['Idea', 'Recruiting', 'Planning', 'Building', 'Operating', 'Growing', 'Paused', 'Completed', 'Archived'];
const COMPENSATIONS: Compensation[] = ['Paid', 'Equity', 'Volunteer', 'Partnership', 'Negotiable'];
const COMMITMENTS = ['Light', 'Part-time', 'Full-time'];
const LOCATIONS = ['Remote', 'Local'];

export function DiscoverPage() {
  const { opportunities } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [stage, setStage] = useState<string>('');
  const [compensation, setCompensation] = useState<string>('');
  const [commitment, setCommitment] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      if (query && !(`${o.title} ${o.description} ${o.skillsNeeded.join(' ')}`.toLowerCase().includes(query.toLowerCase()))) return false;
      if (category && o.category !== category) return false;
      if (stage && o.stage !== stage) return false;
      if (compensation && o.compensation !== compensation) return false;
      if (commitment && o.timeCommitment !== commitment) return false;
      if (location === 'Remote' && !o.remote) return false;
      if (location === 'Local' && o.remote) return false;
      if (verifiedOnly && !o.verified) return false;
      return true;
    });
  }, [opportunities, query, category, stage, compensation, commitment, location, verifiedOnly]);

  const clearAll = () => { setCategory(''); setStage(''); setCompensation(''); setCommitment(''); setLocation(''); setVerifiedOnly(false); setQuery(''); };

  return (
    <div>
      <PageHeader title="Discover Opportunities" subtitle="Browse real ventures across industries. Filter to find your match." />

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input className="input pl-9" placeholder="Search by title, description, or skill..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadein">
          <FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
          <FilterSelect label="Stage" value={stage} onChange={setStage} options={STAGES} />
          <FilterSelect label="Compensation" value={compensation} onChange={setCompensation} options={COMPENSATIONS} />
          <FilterSelect label="Time commitment" value={commitment} onChange={setCommitment} options={COMMITMENTS} />
          <FilterSelect label="Location" value={location} onChange={setLocation} options={LOCATIONS} />
          <div>
            <label className="label">Verified only</label>
            <button aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} className={`btn w-full ${verifiedOnly ? 'bg-accent-50 text-accent-700 border-accent-200' : 'bg-white text-ink-700 border-ink-200'}`}>
              <ShieldCheck className="w-4 h-4" /> {verifiedOnly ? 'Showing verified' : 'Show verified only'}
            </button>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button onClick={clearAll} className="btn-ghost text-sm">Clear all filters</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-500">{filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'}</p>
        <div className="flex flex-wrap gap-1.5">
          {category && <Badge tone="brand">{category}</Badge>}
          {stage && <Badge tone="brand">{stage}</Badge>}
          {compensation && <Badge tone="brand">{compensation}</Badge>}
          {verifiedOnly && <Badge tone="accent"><ShieldCheck className="w-3 h-3" /> Verified</Badge>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Compass className="w-5 h-5" />} title="No opportunities match" description="Try widening your filters or clearing them." action={<button onClick={clearAll} className="btn-secondary">Clear filters</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} />)}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
