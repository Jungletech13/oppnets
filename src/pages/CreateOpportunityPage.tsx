import { useState, useEffect } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Field, Modal, BetaNote } from '@/components/ui';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Check, Eye, ArrowRight, ArrowLeft, Plus, X, Sparkles, Save, RotateCcw } from 'lucide-react';
import type { Opportunity, OpportunityRole, Industry, OpportunityStage, Compensation, OpportunityDNA } from '@/types';

const CATEGORIES: Industry[] = ['Real Estate', 'Cleaning & Services', 'Nonprofit', 'Technology', 'Film & Media', 'E-commerce', 'Food & Restaurant', 'Finance', 'Consulting', 'Community', 'Creative'];
const STAGES: OpportunityStage[] = ['Idea', 'Recruiting', 'Planning', 'Building', 'Operating', 'Growing', 'Paused', 'Completed', 'Archived'];
const COMPENSATIONS: Compensation[] = ['Paid', 'Equity', 'Volunteer', 'Partnership', 'Negotiable'];
const COMMITMENTS = ['Light', 'Part-time', 'Full-time'];
const SKILL_OPTIONS = ['General Contracting', 'Financial Partner', 'Operations Management', 'Grant Writing', 'Fundraising', 'UX Design', 'Frontend Development', 'Backend Development', 'Marketing', 'Film Production', 'Video Editing', 'Cinematography', 'E-commerce Operations', 'Paid Advertising', 'Real Estate Analysis', 'Project Management', 'Cleaning Operations', 'Culinary Operations', 'Legal Operations', 'Sales'];

const STEPS = ['Basics', 'Details', 'Roles & Skills', 'DNA', 'Review & Publish'];

const DRAFT_KEY = 'opportunity-draft';

const defaultForm = {
  title: '', description: '', category: 'Technology' as Industry, stage: 'Recruiting' as OpportunityStage,
  goals: [''], location: '', remote: true, timeCommitment: 'Part-time' as 'Light' | 'Part-time' | 'Full-time',
  roles: [{ id: 'r-new-1', title: '', skillsNeeded: [] as string[], openPositions: 1, compensation: 'Equity' as Compensation, filled: 0 }] as OpportunityRole[],
  skillsNeeded: [] as string[], creatorBrings: '', compensation: 'Equity' as Compensation,
  accepts: 'both' as 'individuals' | 'groups' | 'both', startDate: '', visibility: 'public' as 'public' | 'network' | 'invite',
  requiredSkills: [] as string[], optionalSkills: [] as string[],
  locationPreference: 'Remote' as 'Remote' | 'Local' | 'Hybrid' | 'On-site',
  workStyle: 'Async' as 'Async' | 'Synchronous' | 'Hybrid' | 'On-site',
  riskTolerance: 'Medium' as 'Low' | 'Medium' | 'High',
  leadershipNeeds: 'Co-lead' as 'Lead' | 'Co-lead' | 'Contributor',
  collaborationStyle: 'Flat' as 'Hierarchical' | 'Flat' | 'Consensus' | 'Self-directed',
  missionDrive: 'Balanced' as 'Mission-driven' | 'Profit-driven' | 'Balanced',
  fundingStatus: 'Bootstrapped' as 'Bootstrapped' | 'Self-funded' | 'Seeking funding' | 'Funded',
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveDraft(form: typeof defaultForm) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function generateAISuggestion(field: string, form: typeof defaultForm): string {
  const cat = form.category;
  const suggestions: Record<string, string> = {
    title: form.category ? `${cat} venture — ${form.stage || 'early stage'}` : '',
    description: `This ${cat.toLowerCase()} opportunity aims to ${form.goals.filter(Boolean).join(', ') || 'achieve measurable outcomes'}. We are looking for collaborators who bring complementary skills and shared commitment to the project's success.`,
    creatorBrings: `I bring ${form.skillsNeeded.slice(0, 3).join(', ') || 'domain expertise'} and ${form.fundingStatus === 'Funded' ? 'secured funding' : 'a clear path to execution'}.`,
  };
  return suggestions[field] || '';
}

export function CreateOpportunityPage() {
  const { navigate, createOpportunity, currentUserId } = useApp();
  const [step, setStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [form, setForm] = useState(() => {
    const draft = loadDraft();
    if (draft) { setDraftRestored(true); return { ...defaultForm, ...draft }; }
    return defaultForm;
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f: typeof defaultForm) => ({ ...f, [k]: v }));

  useEffect(() => { saveDraft(form); }, [form]);

  const valid = step < 4 ? true : form.title && form.description && form.location;

  const buildOpportunity = (): Opportunity => ({
    id: `o-${Date.now()}`,
    title: form.title,
    description: form.description,
    category: form.category,
    stage: form.stage,
    goals: form.goals.filter(Boolean),
    location: form.location,
    remote: form.remote,
    timeCommitment: form.timeCommitment,
    roles: form.roles.filter((r: OpportunityRole) => r.title),
    skillsNeeded: form.skillsNeeded,
    creatorBrings: form.creatorBrings,
    compensation: form.compensation,
    accepts: form.accepts,
    startDate: form.startDate || new Date().toISOString().slice(0, 10),
    visibility: form.visibility,
    postedDate: new Date().toISOString().slice(0, 10),
    teamSize: 1,
    verified: false,
    ownerId: currentUserId,
    dna: {
      industry: form.category, stage: form.stage,
      requiredSkills: form.requiredSkills, optionalSkills: form.optionalSkills,
      timeCommitment: form.timeCommitment, locationPreference: form.locationPreference,
      workStyle: form.workStyle, riskTolerance: form.riskTolerance,
      leadershipNeeds: form.leadershipNeeds, collaborationStyle: form.collaborationStyle,
      missionDrive: form.missionDrive, fundingStatus: form.fundingStatus,
    },
  });

  const publish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await createOpportunity(buildOpportunity());
      clearDraft();
      navigate({ name: 'discover' });
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Could not publish this opportunity.');
    } finally {
      setPublishing(false);
    }
  };

  const discardDraft = () => {
    clearDraft();
    setForm(defaultForm);
    setStep(0);
    setDraftRestored(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Create an Opportunity" subtitle="A multi-step form. You will preview the listing before publishing. Your progress is saved automatically." />

      {draftRestored && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-accent-50 border border-accent-200 rounded-lg">
          <Sparkles className="w-4 h-4 text-accent-600" />
          <p className="text-sm text-accent-700 flex-1">Draft restored from your last session.</p>
          <button onClick={discardDraft} className="btn-ghost text-xs"><RotateCcw className="w-3.5 h-3.5" /> Start fresh</button>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${i < step ? 'bg-accent-500 text-white border-accent-500' : i === step ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-400 border-ink-200'}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${i === step ? 'text-ink-900 font-medium' : 'text-ink-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-accent-500' : 'bg-ink-200'}`} />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Opportunity name" hint="Be specific — a clear title helps the right people find you.">
              <div className="flex gap-2">
                <input className="input flex-1" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. House-flipping partnership in East Austin" />
                <button onClick={() => set('title', generateAISuggestion('title', form) || form.title)} className="btn-secondary text-xs whitespace-nowrap"><Sparkles className="w-3.5 h-3.5" /> Suggest</button>
              </div>
            </Field>
            <Field label="Description" hint="Describe what exists, what you need, and what success looks like. This is your pitch to potential collaborators.">
              <div className="flex gap-2 items-start">
                <textarea className="input min-h-[100px] flex-1" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the opportunity, what exists, and what you need." />
                <button onClick={() => set('description', generateAISuggestion('description', form) || form.description)} className="btn-secondary text-xs whitespace-nowrap mt-1"><Sparkles className="w-3.5 h-3.5" /> Suggest</button>
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Category" hint="Choose the industry that best fits your opportunity."><select className="input" value={form.category} onChange={(e) => set('category', e.target.value as Industry)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Current stage" hint="Where is this project right now?"><select className="input" value={form.stage} onChange={(e) => set('stage', e.target.value as OpportunityStage)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Goals" hint="What does success look like? List 2-5 concrete, measurable goals."><GoalEditor goals={form.goals} onChange={(g) => set('goals', g)} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Location" hint="Where is the work happening? Put the city even if remote."><input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, State" /></Field>
              <Field label="Remote availability"><select className="input" value={String(form.remote)} onChange={(e) => set('remote', e.target.value === 'true')}><option value="true">Remote OK</option><option value="false">On-site only</option></select></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Time commitment" hint="How much time do you expect from collaborators?"><select className="input" value={form.timeCommitment} onChange={(e) => set('timeCommitment', e.target.value as 'Light' | 'Part-time' | 'Full-time')}>{COMMITMENTS.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Desired start date"><input type="date" className="input" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
            </div>
            <Field label="What you bring" hint="Assets, capital, skills, access, or progress you already have. Be specific — this builds trust.">
              <div className="flex gap-2 items-start">
                <textarea className="input flex-1" value={form.creatorBrings} onChange={(e) => set('creatorBrings', e.target.value)} placeholder="Assets, capital, skills, access, or progress you already have." />
                <button onClick={() => set('creatorBrings', generateAISuggestion('creatorBrings', form) || form.creatorBrings)} className="btn-secondary text-xs whitespace-nowrap mt-1"><Sparkles className="w-3.5 h-3.5" /> Suggest</button>
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Compensation structure" hint="How will collaborators be rewarded?"><select className="input" value={form.compensation} onChange={(e) => set('compensation', e.target.value as Compensation)}>{COMPENSATIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Accepts"><select className="input" value={form.accepts} onChange={(e) => set('accepts', e.target.value as 'individuals' | 'groups' | 'both')}><option value="both">Individuals and groups</option><option value="individuals">Individuals only</option><option value="groups">Groups only</option></select></Field>
            </div>
            <Field label="Visibility" hint="Public listings are discoverable by everyone. Network-only limits to your connections."><select className="input" value={form.visibility} onChange={(e) => set('visibility', e.target.value as 'public' | 'network' | 'invite')}><option value="public">Public</option><option value="network">Network only</option><option value="invite">Invite only</option></select></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Roles needed" hint="Define each role separately. Clear roles attract the right people.">
              <div className="space-y-3">
                {form.roles.map((r: OpportunityRole, i: number) => (
                  <div key={i} className="border border-ink-200 rounded-lg p-3 space-y-3">
                    <div className="flex gap-2">
                      <input className="input flex-1" placeholder="Role title (e.g. Lead Designer)" value={r.title} onChange={(e) => { const roles = [...form.roles]; roles[i] = { ...r, title: e.target.value }; set('roles', roles); }} />
                      {form.roles.length > 1 && <button onClick={() => set('roles', form.roles.filter((_: OpportunityRole, j: number) => j !== i))} className="btn-ghost"><X className="w-4 h-4" /></button>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-ink-500">Open positions</label>
                        <input type="number" min={1} className="input" value={r.openPositions} onChange={(e) => { const roles = [...form.roles]; roles[i] = { ...r, openPositions: parseInt(e.target.value) || 1 }; set('roles', roles); }} />
                      </div>
                      <div>
                        <label className="text-xs text-ink-500">Compensation</label>
                        <select className="input" value={r.compensation} onChange={(e) => { const roles = [...form.roles]; roles[i] = { ...r, compensation: e.target.value as Compensation }; set('roles', roles); }}>{COMPENSATIONS.map((c) => <option key={c}>{c}</option>)}</select>
                      </div>
                    </div>
                    <SkillPicker selected={r.skillsNeeded} onChange={(skills) => { const roles = [...form.roles]; roles[i] = { ...r, skillsNeeded: skills }; set('roles', roles); }} />
                  </div>
                ))}
                <button onClick={() => set('roles', [...form.roles, { id: 'r-' + Date.now(), title: '', skillsNeeded: [], openPositions: 1, compensation: 'Equity', filled: 0 }])} className="btn-secondary text-sm"><Plus className="w-4 h-4" /> Add role</button>
              </div>
            </Field>
            <Field label="Skills needed (overall)" hint="Select all skills relevant to this opportunity. These power AI matching."><SkillPicker selected={form.skillsNeeded} onChange={(s) => set('skillsNeeded', s)} /></Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">Opportunity DNA powers matching. Be specific — it improves recommendations and helps the right collaborators find you.</p>
            <BetaNote>AI suggestions for DNA fields are a future feature. For now, select manually.</BetaNote>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Required skills" hint="Must-have skills for this opportunity."><SkillPicker selected={form.requiredSkills} onChange={(s) => set('requiredSkills', s)} /></Field>
              <Field label="Optional skills" hint="Nice-to-have skills that would strengthen the team."><SkillPicker selected={form.optionalSkills} onChange={(s) => set('optionalSkills', s)} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Location preference"><select className="input" value={form.locationPreference} onChange={(e) => set('locationPreference', e.target.value as 'Remote' | 'Local' | 'Hybrid' | 'On-site')}><option>Remote</option><option>Local</option><option>Hybrid</option><option>On-site</option></select></Field>
              <Field label="Work style"><select className="input" value={form.workStyle} onChange={(e) => set('workStyle', e.target.value as 'Async' | 'Synchronous' | 'Hybrid' | 'On-site')}><option>Async</option><option>Synchronous</option><option>Hybrid</option><option>On-site</option></select></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Risk tolerance"><select className="input" value={form.riskTolerance} onChange={(e) => set('riskTolerance', e.target.value as 'Low' | 'Medium' | 'High')}><option>Low</option><option>Medium</option><option>High</option></select></Field>
              <Field label="Leadership needs"><select className="input" value={form.leadershipNeeds} onChange={(e) => set('leadershipNeeds', e.target.value as 'Lead' | 'Co-lead' | 'Contributor')}><option>Lead</option><option>Co-lead</option><option>Contributor</option></select></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Collaboration style"><select className="input" value={form.collaborationStyle} onChange={(e) => set('collaborationStyle', e.target.value as 'Hierarchical' | 'Flat' | 'Consensus' | 'Self-directed')}><option>Hierarchical</option><option>Flat</option><option>Consensus</option><option>Self-directed</option></select></Field>
              <Field label="Mission or profit"><select className="input" value={form.missionDrive} onChange={(e) => set('missionDrive', e.target.value as 'Mission-driven' | 'Profit-driven' | 'Balanced')}><option>Mission-driven</option><option>Profit-driven</option><option>Balanced</option></select></Field>
            </div>
            <Field label="Funding status"><select className="input" value={form.fundingStatus} onChange={(e) => set('fundingStatus', e.target.value as 'Bootstrapped' | 'Self-funded' | 'Seeking funding' | 'Funded')}><option>Bootstrapped</option><option>Self-funded</option><option>Seeking funding</option><option>Funded</option></select></Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">Review your listing. This is how it will appear in the marketplace.</p>
            <div className="max-w-md">
              <OpportunityCard opp={buildOpportunity()} />
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <Badge tone="amber">Unverified</Badge>
              New opportunities are unverified until reviewed.
            </div>
          </div>
        )}
      </Card>

      {publishError && <p className="text-sm text-red-600 mt-3" role="alert">{publishError}</p>}

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-5">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate({ name: 'discover' })} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}</button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 flex items-center gap-1"><Save className="w-3 h-3" /> Draft saved</span>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary" disabled={!valid}>Continue <ArrowRight className="w-4 h-4" /></button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowPreview(true)} className="btn-secondary"><Eye className="w-4 h-4" /> Full preview</button>
              <button onClick={publish} className="btn-primary" disabled={publishing}>{publishing ? 'Publishing...' : 'Publish'} <Check className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Opportunity preview" wide>
        <div className="max-w-md mx-auto"><OpportunityCard opp={buildOpportunity()} /></div>
      </Modal>
    </div>
  );
}

function GoalEditor({ goals, onChange }: { goals: string[]; onChange: (g: string[]) => void }) {
  return (
    <div className="space-y-2">
      {goals.map((g, i) => (
        <div key={i} className="flex gap-2">
          <input className="input flex-1" placeholder="e.g. Renovate and sell within 6 months" value={g} onChange={(e) => { const next = [...goals]; next[i] = e.target.value; onChange(next); }} />
          {goals.length > 1 && <button onClick={() => onChange(goals.filter((_, j) => j !== i))} className="btn-ghost"><X className="w-4 h-4" /></button>}
        </div>
      ))}
      <button onClick={() => onChange([...goals, ''])} className="btn-ghost text-sm"><Plus className="w-4 h-4" /> Add goal</button>
    </div>
  );
}

function SkillPicker({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  const toggle = (s: string) => onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {SKILL_OPTIONS.map((s) => (
        <button key={s} type="button" onClick={() => toggle(s)} className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${selected.includes(s) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}>
          {s}
        </button>
      ))}
    </div>
  );
}
