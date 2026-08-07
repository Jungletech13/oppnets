import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Avatar, TrustIndicators, VerificationPill, Badge, SectionHeader, EmptyState, Modal, Field } from '@/components/ui';
import { MapPin, Clock, Briefcase, Heart, Target, Users, MessageSquare, ShieldAlert, Award, Rocket, Search, ShieldCheck } from 'lucide-react';
import { getProfile, getSpace } from '@/data';
import { useState, useEffect } from 'react';
import { fetchVerifiedCollaborationCount } from '@/lib/trust-queries';
import type { Profile, VentureOutcome } from '@/types';

const outcomeTone: Record<string, 'accent' | 'brand' | 'amber' | 'neutral' | 'slate'> = {
  Active: 'brand', Completed: 'accent', Launched: 'accent', Operating: 'brand', Acquired: 'accent',
  Sold: 'accent', Paused: 'amber', Closed: 'slate', Archived: 'slate',
};

const visibilityLabel: Record<string, string> = { private: 'Private', participants: 'Participants only', profile: 'On profile', public: 'Public' };

export function ProfilePage({ profileId }: { profileId?: string }) {
  const { profiles, currentUserId, navigate, startConversation, reportUser, spaces, opportunities } = useApp();
  const id = profileId ?? currentUserId;
  const profile = profiles.find((p) => p.id === id);
  const isMe = id === currentUserId;
  const [showMessage, setShowMessage] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [verifiedCollabCount, setVerifiedCollabCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchVerifiedCollaborationCount(id)
      .then((c) => { if (active) setVerifiedCollabCount(c); })
      .catch(() => { if (active) setVerifiedCollabCount(null); });
    return () => { active = false; };
  }, [id]);

  if (!profile) return <EmptyState icon={<Users className="w-5 h-5" />} title="Profile not found" description="This profile does not exist." />;

  const buildingSpaces = profile.buildingIds.map((id) => getSpace(id)).filter(Boolean);
  const myOpportunities = opportunities.filter((o) => o.ownerId === id);
  const myCollaborationSpaces = spaces.filter((s) => s.memberIds.includes(id));

  return (
    <div>
      {!isMe && <button onClick={() => navigate({ name: 'people' })} className="btn-ghost text-sm mb-2">&larr; Back</button>}

      {/* Header card */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Avatar src={profile.photoUrl} name={profile.name} size={80} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-ink-900">{profile.name}</h1>
              <TrustIndicators profile={profile} size="md" />
            </div>
            <p className="text-sm text-ink-600 mt-0.5">{profile.headline}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{profile.timeCommitment}</span>
              <Badge tone={profile.availability === 'Available' ? 'accent' : profile.availability === 'Limited' ? 'amber' : 'slate'}>{profile.availability}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <button onClick={() => setEditing(true)} className="btn-secondary">Edit profile</button>
            ) : (
              <>
                <button onClick={() => setShowMessage(true)} className="btn-secondary"><MessageSquare className="w-4 h-4" /> Message</button>
                <button onClick={() => setShowReport(true)} className="btn-ghost text-red-600"><ShieldAlert className="w-4 h-4" /></button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <Card className="p-5">
            <SectionHeader title="About" />
            <p className="text-sm text-ink-700 leading-relaxed">{profile.bio}</p>
          </Card>

          {/* Skills & interests */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-5">
              <SectionHeader title="Skills" />
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => <span key={s} className="text-xs bg-brand-50 text-brand-700 rounded px-2 py-1">{s}</span>)}
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Interests" />
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((s) => <span key={s} className="text-xs bg-ink-100 text-ink-600 rounded px-2 py-1">{s}</span>)}
              </div>
            </Card>
          </div>

          {/* Industries & availability */}
          <Card className="p-5">
            <SectionHeader title="Industries & availability" />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-400 mb-1">Industries</p>
                <div className="flex flex-wrap gap-1.5">{profile.industries.map((i) => <Badge key={i} tone="neutral">{i}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Availability</p>
                <p className="text-ink-700">{profile.availability} · {profile.timeCommitment}</p>
              </div>
            </div>
          </Card>

          {/* What I'm building */}
          <Card className="p-5">
            <SectionHeader title="What I'm building" subtitle="Active ventures and collaboration spaces." />
            {buildingSpaces.length === 0 && myCollaborationSpaces.length === 0 ? (
              <p className="text-sm text-ink-500">No active ventures.</p>
            ) : (
              <div className="space-y-2">
                {buildingSpaces.map((s) => s && (
                  <button key={s.id} onClick={() => navigate({ name: 'space', spaceId: s.id })} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                    <Rocket className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-medium text-ink-800 flex-1">{s.name}</span>
                    <Badge tone="brand">Active</Badge>
                  </button>
                ))}
                {myCollaborationSpaces.filter((s) => !profile.buildingIds.includes(s.id)).map((s) => (
                  <button key={s.id} onClick={() => navigate({ name: 'space', spaceId: s.id })} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                    <Users className="w-4 h-4 text-ink-400" />
                    <span className="text-sm font-medium text-ink-800 flex-1">{s.name}</span>
                    <Badge tone="neutral">Collaborator</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* What I'm looking for */}
          <Card className="p-5">
            <SectionHeader title="What I'm looking for" subtitle="Types of opportunities this builder is seeking." />
            <ul className="space-y-2">
              {profile.opportunitiesSought.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-700"><Search className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" /> {o}</li>
              ))}
            </ul>
          </Card>

          {/* Current opportunities */}
          {myOpportunities.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="Current opportunities" subtitle="Opportunities this builder has posted." />
              <div className="space-y-2">
                {myOpportunities.map((o) => (
                  <button key={o.id} onClick={() => navigate({ name: 'opportunity', opportunityId: o.id })} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                    <Briefcase className="w-4 h-4 text-brand-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate">{o.title}</p>
                      <p className="text-xs text-ink-500">{o.category} · {o.stage}</p>
                    </div>
                    <Badge tone={o.stage === 'Recruiting' ? 'accent' : 'neutral'}>{o.stage}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Venture history */}
          <Card className="p-5">
            <SectionHeader title="Venture history" subtitle="Factual outcomes. Private outcomes are not shown without permission." />
            <div className="space-y-3">
              {profile.ventureHistory.map((v) => <VentureRow key={v.id} v={v} />)}
            </div>
          </Card>

          {/* Collaboration history */}
          <Card className="p-5">
            <SectionHeader title="Collaboration history" />
            <div className="space-y-2">
              {profile.collaborationHistory.length === 0 ? <p className="text-sm text-ink-500">No prior collaborations listed.</p> : profile.collaborationHistory.map((c, i) => {
                const partner = getProfile(c.partnerId);
                return partner ? (
                  <button key={i} onClick={() => navigate({ name: 'profile', profileId: partner.id })} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                    <Avatar src={partner.photoUrl} name={partner.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800">{partner.name}</p>
                      <p className="text-xs text-ink-500">{c.summary}</p>
                    </div>
                    <Badge tone="neutral">{c.count} together</Badge>
                  </button>
                ) : null;
              })}
            </div>
          </Card>

          {/* Endorsements */}
          <Card className="p-5">
            <SectionHeader title="References & endorsements" />
            {profile.endorsements.length === 0 ? <p className="text-sm text-ink-500">No endorsements yet.</p> : (
              <div className="space-y-3">
                {profile.endorsements.map((e, i) => {
                  const from = getProfile(e.fromId);
                  return (
                    <div key={i} className="border-l-2 border-brand-200 pl-3">
                      <p className="text-sm text-ink-700 italic">"{e.text}"</p>
                      <p className="text-xs text-ink-500 mt-1">— {from?.name ?? 'Unknown'} · {e.skill}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Side column — verifications */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionHeader title="Verification" />
            <div className="space-y-2">
              {profile.verifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">{v.label}</span>
                  <VerificationPill state={v.state} />
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-400 mt-3">Claim-level verification. Each claim is checked separately.</p>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Roles held" />
            <div className="flex flex-wrap gap-1.5">
              {profile.rolesHeld.map((r) => <Badge key={r} tone="neutral"><Award className="w-3 h-3" />{r}</Badge>)}
            </div>
          </Card>

          {isMe && (
            <Card className="p-5">
              <SectionHeader title="Verified collaborations" />
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-accent-500" />
                <div>
                  <p className="text-2xl font-bold text-ink-900">{verifiedCollabCount ?? '—'}</p>
                  <p className="text-xs text-ink-500">confirmed shared work</p>
                </div>
              </div>
              <p className="text-xs text-ink-400 mt-3">Verified collaboration confirms documented shared participation. It does not guarantee work quality, endorsement, or future performance.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Message modal */}
      <Modal open={showMessage} onClose={() => setShowMessage(false)} title={`Message ${profile.name}`}>
        <MessageComposer onSend={(text) => { startConversation([profile.id], `Conversation with ${profile.name}`, 'direct'); setShowMessage(false); }} />
      </Modal>

      {/* Report modal */}
      <Modal open={showReport} onClose={() => setShowReport(false)} title="Report this user">
        <ReportForm onSubmit={(reason) => { reportUser(profile.id, reason); setShowReport(false); }} />
      </Modal>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit profile" wide>
        <EditProfileForm profile={profile} onSave={() => setEditing(false)} />
      </Modal>
    </div>
  );
}

function VentureRow({ v }: { v: VentureOutcome }) {
  return (
    <div className="border border-ink-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink-900 text-sm">{v.title}</h4>
        <Badge tone={outcomeTone[v.outcome] || 'neutral'}>{v.outcome}</Badge>
      </div>
      <p className="text-xs text-ink-500 mt-0.5">{v.role} · {v.industry} · {v.year}</p>
      <p className="text-sm text-ink-600 mt-1.5">{v.summary}</p>
      <p className="text-xs text-ink-400 mt-1.5">Visibility: {visibilityLabel[v.visibility]}</p>
    </div>
  );
}

function MessageComposer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-3">
      <Field label="Message"><textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Introduce yourself and your opportunity..." /></Field>
      <div className="flex justify-end"><button onClick={() => text && onSend(text)} className="btn-primary" disabled={!text}>Send</button></div>
    </div>
  );
}

function ReportForm({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">Reports are reviewed by moderation. Use factual language.</p>
      <Field label="Reason"><textarea className="input min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the concern factually..." /></Field>
      <div className="flex justify-end"><button onClick={() => reason && onSubmit(reason)} className="btn-primary" disabled={!reason}>Submit report</button></div>
    </div>
  );
}

function EditProfileForm({ profile, onSave }: { profile: Profile; onSave: () => void }) {
  const { updateProfile } = useApp();
  const [p, setP] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(p);
      onSave();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-3">
      <Field label="Name"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
      <Field label="Headline"><input className="input" value={p.headline} onChange={(e) => setP({ ...p, headline: e.target.value })} /></Field>
      <Field label="Bio"><textarea className="input min-h-[80px]" value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Location"><input className="input" value={p.location} onChange={(e) => setP({ ...p, location: e.target.value })} /></Field>
        <Field label="Availability"><select className="input" value={p.availability} onChange={(e) => setP({ ...p, availability: e.target.value as Profile['availability'] })}><option>Available</option><option>Limited</option><option>Unavailable</option></select></Field>
      </div>
      <Field label="Time commitment"><select className="input" value={p.timeCommitment} onChange={(e) => setP({ ...p, timeCommitment: e.target.value as Profile['timeCommitment'] })}><option>Not specified</option><option>Light</option><option>Part-time</option><option>Full-time</option></select></Field>
      <Field label="Skills (comma separated)"><input className="input" value={p.skills.join(', ')} onChange={(e) => setP({ ...p, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
      <Field label="Industries (comma separated)"><input className="input" value={p.industries.join(', ')} onChange={(e) => setP({ ...p, industries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) as Profile['industries'] })} placeholder="Technology, Finance, Consulting" /></Field>
      <Field label="Interests (comma separated)"><input className="input" value={p.interests.join(', ')} onChange={(e) => setP({ ...p, interests: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Venture partnerships, AI products, community impact" /></Field>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex justify-end"><button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </div>
  );
}
