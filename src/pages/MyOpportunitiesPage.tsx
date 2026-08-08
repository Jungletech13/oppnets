import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Card, SectionHeader, EmptyState, Badge, Avatar, ProgressBar } from '@/components/ui';
import { Briefcase, LayoutDashboard, Plus, ArrowRight, Users } from 'lucide-react';
import { getProfile } from '@/data';
import { useEffect, useState } from 'react';
import { decideOpportunityApplication, fetchApplications } from '@/lib/queries';

interface OpportunityApplicationRow {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  role_id?: string | null;
  message?: string;
  status: string;
  applied_at?: string;
}

export function MyOpportunitiesPage() {
  const { opportunities, spaces, profiles, currentUserId, navigate, retryDataLoad } = useApp();
  const [applications, setApplications] = useState<OpportunityApplicationRow[]>([]);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const myPosted = opportunities.filter((o) => o.ownerId === currentUserId);
  const mySpaces = spaces.filter((s) => s.memberIds.includes(currentUserId));

  useEffect(() => {
    const posted = opportunities.filter((opportunity) => opportunity.ownerId === currentUserId);
    void Promise.all(posted.map((opportunity) => fetchApplications(opportunity.id)))
      .then((rows) => setApplications(rows.flat().filter((row) => row.status === 'pending') as OpportunityApplicationRow[]))
      .catch((error) => setDecisionError(error instanceof Error ? error.message : 'Could not load applications.'));
  }, [opportunities, currentUserId]);

  const decide = async (applicationId: string, decision: 'accepted' | 'rejected') => {
    setDecidingId(applicationId);
    setDecisionError(null);
    try {
      await decideOpportunityApplication(applicationId, decision);
      setApplications((current) => current.filter((application) => application.id !== applicationId));
      if (decision === 'accepted') retryDataLoad();
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Could not update the application.');
    } finally {
      setDecidingId(null);
    }
  };

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

      <section className="mb-8">
        <SectionHeader title="Pending applications" subtitle="Review each request before creating a shared workspace." />
        {decisionError && <p role="alert" className="text-sm text-red-600 mb-3">{decisionError}</p>}
        {applications.length === 0 ? (
          <EmptyState icon={<Users className="w-5 h-5" />} title="No pending applications" description="New collaboration requests will appear here." />
        ) : (
          <div className="space-y-3">
            {applications.map((application) => {
              const applicant = profiles.find((profile) => profile.id === application.applicant_id);
              const opportunity = opportunities.find((item) => item.id === application.opportunity_id);
              const role = opportunity?.roles.find((item) => item.id === application.role_id);
              return (
                <Card key={application.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <Avatar src={applicant?.photoUrl || ''} name={applicant?.name || 'Applicant'} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-900">{applicant?.name || 'Applicant'}</p>
                      <p className="text-xs text-ink-500">Applied to {opportunity?.title || 'your opportunity'}{role ? ` · ${role.title}` : ''}</p>
                      <p className="text-sm text-ink-700 mt-2 whitespace-pre-wrap">{application.message || 'No application message provided.'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary" disabled={decidingId === application.id} onClick={() => void decide(application.id, 'rejected')}>Decline</button>
                      <button className="btn-primary" disabled={decidingId === application.id} onClick={() => void decide(application.id, 'accepted')}>{decidingId === application.id ? 'Saving...' : 'Accept'}</button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
