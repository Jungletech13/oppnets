import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Card, SectionHeader, EmptyState, Badge, Avatar, ProgressBar } from '@/components/ui';
import { Briefcase, LayoutDashboard, Plus, ArrowRight } from 'lucide-react';
import { getProfile } from '@/data';

export function MyOpportunitiesPage() {
  const { opportunities, spaces, currentUserId, navigate } = useApp();

  const myPosted = opportunities.filter((o) => o.ownerId === currentUserId);
  const mySpaces = spaces.filter((s) => s.memberIds.includes(currentUserId));

  return (
    <div>
      <PageHeader title="My Opportunities" subtitle="Opportunities you posted and spaces you are part of." action={<button onClick={() => navigate({ name: 'create-opportunity' })} className="btn-primary"><Plus className="w-4 h-4" /> New</button>} />

      <section className="mb-8">
        <SectionHeader title="Posted by me" />
        {myPosted.length === 0 ? (
          <EmptyState icon={<Briefcase className="w-5 h-5" />} title="No opportunities posted" description="Create your first opportunity to find collaborators." action={<button onClick={() => navigate({ name: 'create-opportunity' })} className="btn-primary"><Plus className="w-4 h-4" /> Create opportunity</button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPosted.map((o) => <OpportunityCard key={o.id} opp={o} />)}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Collaboration Spaces I am in" />
        {mySpaces.length === 0 ? (
          <EmptyState icon={<LayoutDashboard className="w-5 h-5" />} title="No active spaces" description="Start a collaboration from an opportunity." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {mySpaces.map((s) => {
              const total = s.tasks.reduce((a, t) => a + t.checklist.length, 0);
              const approved = s.tasks.reduce((a, t) => a + t.checklist.filter((c) => c.done && !c.submittedForReview).length, 0);
              const pct = total ? Math.round((approved / total) * 100) : 0;
              return (
                <Card key={s.id} hover onClick={() => navigate({ name: 'space', spaceId: s.id })} className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutDashboard className="w-4 h-4 text-brand-600" />
                    <h3 className="font-semibold text-ink-900 text-sm flex-1 truncate">{s.name}</h3>
                  </div>
                  <p className="text-xs text-ink-500 line-clamp-2 mb-3">{s.description}</p>
                  <ProgressBar value={pct} showLabel />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex -space-x-1.5">
                      {s.memberIds.slice(0, 4).map((id) => { const p = getProfile(id); return p ? <Avatar key={id} src={p.photoUrl} name={p.name} size={22} /> : null; })}
                    </div>
                    <span className="text-xs text-brand-600 font-medium inline-flex items-center">Open <ArrowRight className="w-3 h-3" /></span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
