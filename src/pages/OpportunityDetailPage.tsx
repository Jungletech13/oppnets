import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Badge, Card, Avatar, TrustIndicators, VerificationPill, SectionHeader, Modal, BetaNote } from '@/components/ui';
import { MatchReasons } from '@/components/OpportunityCard';
import { MapPin, Clock, Users, Calendar, ShieldCheck, Target, User as UserIcon, Layers, Briefcase, ArrowRight, Plus } from 'lucide-react';
import { getProfile } from '@/data';
import { useState } from 'react';
import type { OpportunityDNA } from '@/types';

export function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  const { opportunities, navigate, createSpaceFromOpportunity, profiles, currentUserId } = useApp();
  const opp = opportunities.find((o) => o.id === opportunityId);
  const [showConnect, setShowConnect] = useState(false);
  const [created, setCreated] = useState<string | false>(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (!opp) {
    return <EmptyState message="Opportunity not found." />;
  }
  const owner = getProfile(opp.ownerId);

  const handleCreateSpace = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const id = await createSpaceFromOpportunity(opp.id, opp.title, opp.description, [currentUserId, opp.ownerId]);
      setCreated(id);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create the collaboration space.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate({ name: 'discover' })} className="btn-ghost text-sm mb-2">&larr; Back to Discover</button>
      <PageHeader
        title={opp.title}
        subtitle={opp.description}
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowConnect(true)} className="btn-primary"><Plus className="w-4 h-4" /> Start Collaboration</button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Match reasons */}
          {opp.matchReasons && <MatchReasons reasons={opp.matchReasons} />}

          {/* Overview */}
          <Card className="p-5">
            <SectionHeader title="Overview" />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info icon={MapPin} label="Location" value={opp.remote ? 'Remote' : opp.location} />
              <Info icon={Clock} label="Time commitment" value={opp.timeCommitment} />
              <Info icon={Users} label="Current team size" value={`${opp.teamSize}`} />
              <Info icon={Calendar} label="Posted" value={opp.postedDate} />
              <Info icon={Calendar} label="Desired start" value={opp.startDate} />
              <Info icon={ShieldCheck} label="Verification" value={opp.verified ? 'Verified opportunity' : 'Unverified'} />
            </div>
          </Card>

          {/* Goals */}
          <Card className="p-5">
            <SectionHeader title="Goals" />
            <ul className="space-y-2">
              {opp.goals.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                  <Target className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" /> {g}
                </li>
              ))}
            </ul>
          </Card>

          {/* Roles */}
          <Card className="p-5">
            <SectionHeader title="Roles needed" />
            <div className="space-y-3">
              {opp.roles.map((r) => (
                <div key={r.id} className="border border-ink-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-ink-900">{r.title}</h4>
                    <Badge tone="brand">{r.compensation}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{r.openPositions} open · {r.filled} filled</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.skillsNeeded.map((s) => <span key={s} className="text-xs bg-ink-100 text-ink-600 rounded px-2 py-0.5">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Opportunity DNA */}
          <Card className="p-5">
            <SectionHeader title="Opportunity DNA" subtitle="Structured matching data for this opportunity." />
            <DNAGrid dna={opp.dna} />
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Creator */}
          {owner && (
            <Card className="p-5">
              <SectionHeader title="Posted by" />
              <button onClick={() => navigate({ name: 'profile', profileId: owner.id })} className="flex items-center gap-3 w-full text-left">
                <Avatar src={owner.photoUrl} name={owner.name} size={48} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{owner.name}</p>
                  <p className="text-xs text-ink-500 truncate">{owner.headline}</p>
                </div>
              </button>
              <div className="flex items-center justify-between mt-3">
                <TrustIndicators profile={owner} />
                <span className="text-xs text-ink-500">{owner.location}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-ink-100 space-y-1.5">
                {owner.verifications.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink-600">{v.label}</span>
                    <VerificationPill state={v.state} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* What creator brings */}
          <Card className="p-5">
            <SectionHeader title="What the creator brings" />
            <p className="text-sm text-ink-700">{opp.creatorBrings}</p>
          </Card>

          {/* Compensation & accepts */}
          <Card className="p-5">
            <SectionHeader title="Participation" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Compensation</span><Badge tone="brand">{opp.compensation}</Badge></div>
              <div className="flex justify-between"><span className="text-ink-500">Accepts</span><span className="text-ink-700 capitalize">{opp.accepts}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Visibility</span><span className="text-ink-700 capitalize">{opp.visibility}</span></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Connect modal */}
      <Modal open={showConnect} onClose={() => { setShowConnect(false); setCreated(false); }} title={created ? 'Collaboration Space created' : 'Start a collaboration'} wide>
        {created ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center mx-auto mb-3"><ShieldCheck className="w-6 h-6" /></div>
            <h3 className="font-semibold text-ink-900">Your Collaboration Space is ready</h3>
            <p className="text-sm text-ink-500 mt-1">You and {owner?.name} can now plan tasks, milestones, and reviews together.</p>
            <button onClick={() => navigate({ name: 'space', spaceId: created as string })} className="btn-primary mt-4">Open Space <ArrowRight className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="space-y-4">
            <BetaNote>This MVP simulates connection and team formation. In production, applications would require owner approval.</BetaNote>
            <p className="text-sm text-ink-600">Starting a collaboration creates a dedicated Collaboration Space for this opportunity with you and the opportunity owner as initial members.</p>
            {createError && <p className="text-sm text-red-600" role="alert">{createError}</p>}
            {opp.accepts !== 'individuals' && (
              <div className="card p-3">
                <p className="text-xs font-medium text-ink-700 mb-2">Suggested collaborators to invite:</p>
                <div className="space-y-2">
                  {profiles.filter((p) => p.id !== currentUserId && p.id !== opp.ownerId).slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Avatar src={p.photoUrl} name={p.name} size={28} />
                      <span className="text-sm text-ink-700 flex-1">{p.name}</span>
                      <span className="text-xs text-ink-500">{p.headline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConnect(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateSpace} className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Collaboration Space'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-ink-400 shrink-0" />
      <div>
        <div className="text-xs text-ink-400">{label}</div>
        <div className="text-sm text-ink-800 font-medium">{value}</div>
      </div>
    </div>
  );
}

function DNAGrid({ dna }: { dna: OpportunityDNA }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Industry', value: dna.industry },
    { label: 'Stage', value: dna.stage },
    { label: 'Required skills', value: dna.requiredSkills.join(', ') },
    { label: 'Optional skills', value: dna.optionalSkills.join(', ') || '—' },
    { label: 'Time commitment', value: dna.timeCommitment },
    { label: 'Location preference', value: dna.locationPreference },
    { label: 'Work style', value: dna.workStyle },
    { label: 'Risk tolerance', value: dna.riskTolerance },
    { label: 'Leadership needs', value: dna.leadershipNeeds },
    { label: 'Collaboration style', value: dna.collaborationStyle },
    { label: 'Mission drive', value: dna.missionDrive },
    { label: 'Funding status', value: dna.fundingStatus },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col">
          <span className="text-xs text-ink-400">{r.label}</span>
          <span className="text-sm text-ink-800">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-ink-500">{message}</p>
      <button onClick={() => window.history.back()} className="btn-secondary mt-4">Go back</button>
    </div>
  );
}
