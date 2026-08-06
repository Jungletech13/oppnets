import { CollaborationGroup, Profile } from '@/types';
import { Badge, Card, Avatar, TrustIndicators } from './ui';
import { Users, Award, Briefcase, Calendar } from 'lucide-react';
import { useApp } from '@/store';
import { getProfile } from '@/data';

const kindLabel: Record<string, string> = {
  individual: 'Individual',
  pair: 'Frequent collaborator pair',
  group: 'Established collaboration group',
  team: 'User-created team',
};

export function GroupCard({ group }: { group: CollaborationGroup }) {
  const { navigate } = useApp();
  const members = group.memberIds.map((id) => getProfile(id)).filter(Boolean) as Profile[];

  return (
    <Card hover onClick={() => navigate({ name: 'profile', profileId: members[0].id })} className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Badge tone="brand">{kindLabel[group.kind]}</Badge>
        <Badge tone="neutral">{group.industries.join(', ')}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((m) => (
            <Avatar key={m.id} src={m.photoUrl} name={m.name} size={36} />
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-ink-900">{group.name}</h3>
          <p className="text-xs text-ink-500">{members.map((m) => m.name.split(' ')[0]).join(', ')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-ink-600">
        <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-ink-400" />{group.venturesCompletedTogether} ventures together</div>
        <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-ink-400" />{group.activeVentures} active</div>
        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-ink-400" />{group.historyLengthMonths} mo history</div>
        <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-ink-400" />{group.availabilityGroup}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.combinedSkills.slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-ink-100 text-ink-600 rounded px-2 py-0.5">{s}</span>
        ))}
      </div>
      <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
        <div className="text-xs font-semibold text-brand-700 mb-1">Why recommended</div>
        <ul className="space-y-0.5">
          {group.matchReasons.map((r, i) => (
            <li key={i} className="text-xs text-brand-800 flex items-start gap-1"><span className="text-brand-400">•</span>{r}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function PersonCard({ profile }: { profile: Profile }) {
  const { navigate } = useApp();
  return (
    <Card hover onClick={() => navigate({ name: 'profile', profileId: profile.id })} className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar src={profile.photoUrl} name={profile.name} size={48} />
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900 truncate">{profile.name}</h3>
          <p className="text-xs text-ink-500 truncate">{profile.headline}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge tone={profile.availability === 'Available' ? 'accent' : profile.availability === 'Limited' ? 'amber' : 'slate'}>
          {profile.availability}
        </Badge>
        <TrustIndicators profile={profile} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-ink-100 text-ink-600 rounded px-2 py-0.5">{s}</span>
        ))}
      </div>
      <p className="text-xs text-ink-500">{profile.location} · {profile.timeCommitment}</p>
    </Card>
  );
}
