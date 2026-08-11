import { useState, useMemo } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { PersonCard, GroupCard } from '@/components/PeopleCards';
import { Badge, EmptyState } from '@/components/ui';
import { Search, Users, ShieldCheck } from 'lucide-react';
import type { GroupKind } from '@/types';
import { groupMatchesKind, showGroupsForKind, showIndividualsForKind } from '@/lib/people-directory';

export function PeoplePage() {
  const { profiles, groups, currentUserId } = useApp();
  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [kind, setKind] = useState<GroupKind | ''>('');

  const showIndividuals = showIndividualsForKind(kind);
  const showCollaborationGroups = showGroupsForKind(kind);

  const people = useMemo(() => profiles.filter((p) => p.id !== currentUserId), [profiles, currentUserId]);

  const filteredPeople = people.filter((p) => {
    if (query && !(`${p.name} ${p.headline} ${p.skills.join(' ')} ${p.industries.join(' ')}`.toLowerCase().includes(query.toLowerCase()))) return false;
    if (verifiedOnly && !p.verifications.some((v) => v.state === 'verified' && (v.type === 'identity' || v.type === 'employment' || v.type === 'business_ownership' || v.type === 'venture_participation'))) return false;
    return true;
  });

  const filteredGroups = groups.filter((g) => {
    if (query && !(`${g.name} ${g.combinedSkills.join(' ')} ${g.industries.join(' ')}`.toLowerCase().includes(query.toLowerCase()))) return false;
    if (!groupMatchesKind(g, kind)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="People and Teams" subtitle="Individuals and proven collaborator groups in one search — no need to choose." />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input className="input pl-9" placeholder="Search by name, skill, or industry..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select
          aria-label="People and team type"
          className="input sm:w-48"
          value={kind}
          onChange={(e) => setKind(e.target.value as GroupKind | '')}
        >
          <option value="">All group types</option>
          <option value="individual">Individuals</option>
          <option value="pair">Frequent pairs</option>
          <option value="group">Established groups</option>
          <option value="team">User-created teams</option>
        </select>
        <button aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} className={`btn ${verifiedOnly ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-white text-ink-700 border border-ink-200'} px-4 py-2 text-sm`}>
          <ShieldCheck className="w-4 h-4" /> Verified
        </button>
      </div>

      {/* Individuals */}
      {showIndividuals && <section className={showCollaborationGroups ? 'mb-8' : undefined}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-ink-400" />
          <h2 className="font-semibold text-ink-900">Individuals</h2>
          <Badge tone="neutral">{filteredPeople.length}</Badge>
        </div>
        {filteredPeople.length === 0 ? (
          <EmptyState icon={<Users className="w-5 h-5" />} title="No individuals match" description="Try a different search." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeople.map((p) => <PersonCard key={p.id} profile={p} />)}
          </div>
        )}
      </section>}

      {/* Groups */}
      {showCollaborationGroups && <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-ink-400" />
          <h2 className="font-semibold text-ink-900">Collaboration groups</h2>
          <Badge tone="neutral">{filteredGroups.length}</Badge>
        </div>
        <p className="text-sm text-ink-500 mb-3">Factual history only — no superlatives. Each result explains why it was recommended.</p>
        {filteredGroups.length === 0 ? (
          <EmptyState icon={<Users className="w-5 h-5" />} title="No groups match" description="Try a different search or group type." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((g) => <GroupCard key={g.id} group={g} />)}
          </div>
        )}
      </section>}
    </div>
  );
}
