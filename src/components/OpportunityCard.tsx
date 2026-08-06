import { Opportunity } from '@/types';
import { Badge, Card } from './ui';
import { MapPin, Calendar, Users, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '@/store';

const stageTone: Record<string, 'neutral' | 'brand' | 'accent' | 'amber' | 'red' | 'slate'> = {
  Idea: 'slate', Recruiting: 'brand', Planning: 'amber', Building: 'brand', Operating: 'accent',
  Growing: 'accent', Paused: 'amber', Completed: 'accent', Archived: 'slate',
};

export function OpportunityCard({ opp }: { opp: Opportunity }) {
  const { navigate } = useApp();
  const openPositions = opp.roles.reduce((a, r) => a + r.openPositions, 0);
  return (
    <Card hover onClick={() => navigate({ name: 'opportunity', opportunityId: opp.id })} className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="neutral">{opp.category}</Badge>
          <Badge tone={stageTone[opp.stage] || 'neutral'}>{opp.stage}</Badge>
          {opp.verified && (
            <Badge tone="accent"><ShieldCheck className="w-3 h-3" /> Verified</Badge>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-ink-900 leading-snug">{opp.title}</h3>
        <p className="text-sm text-ink-500 mt-1 line-clamp-2">{opp.description}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{opp.remote ? 'Remote' : opp.location}</span>
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{opp.timeCommitment}</span>
        <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />Team {opp.teamSize}</span>
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{opp.postedDate}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {opp.skillsNeeded.slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-ink-100 text-ink-600 rounded px-2 py-0.5">{s}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-ink-100">
        <span className="text-xs text-ink-500">{openPositions} open {openPositions === 1 ? 'role' : 'roles'}</span>
        <span className="text-xs font-medium text-brand-600">{opp.compensation}</span>
      </div>
    </Card>
  );
}

export function MatchReasons({ reasons }: { reasons?: string[] }) {
  if (!reasons?.length) return null;
  return (
    <div className="rounded-lg bg-brand-50 border border-brand-100 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 mb-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Why this matches
      </div>
      <ul className="space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className="text-xs text-brand-800 flex items-start gap-1.5">
            <span className="text-brand-400 mt-0.5">•</span> {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
