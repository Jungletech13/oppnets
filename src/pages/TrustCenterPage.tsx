import { useState } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, SectionHeader, Badge, VerificationPill, Modal, Field, BetaNote } from '@/components/ui';
import { ShieldCheck, ShieldAlert, Shield, AlertTriangle, FileWarning, Scale, Info, Lock, Phone, UserCog, Users, Star, ScanSearch, XCircle, CheckCircle2 } from 'lucide-react';
import { getProfile } from '@/data';
import type { AccountStanding, TrustLayerInfo, FraudAlert, CollaborationReview } from '@/types';

const standingTone: Record<AccountStanding, 'accent' | 'amber' | 'red'> = {
  'Good standing': 'accent',
  'Verification incomplete': 'amber',
  'Account under review': 'amber',
  'Account restricted': 'red',
  'Account suspended for policy violations': 'red',
};

const layerIcons = [Lock, Phone, UserCog, Users, Star, ScanSearch];
const layerStatusTone: Record<string, 'accent' | 'amber' | 'slate'> = {
  verified: 'accent',
  pending: 'amber',
  unverified: 'slate',
  not_applicable: 'slate',
};

function LayerCard({ layer }: { layer: TrustLayerInfo }) {
  const Icon = layerIcons[layer.number - 1] ?? Shield;
  const tone = layerStatusTone[layer.userStatus] ?? 'slate';
  return (
    <div className="border border-ink-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-ink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-ink-400">Layer {layer.number}</span>
              <h3 className="text-sm font-semibold text-ink-900">{layer.name}</h3>
            </div>
            <Badge tone={tone}>
              {layer.userStatus === 'verified' ? 'Verified' : layer.userStatus === 'pending' ? 'Pending' : layer.userStatus === 'not_applicable' ? 'N/A' : 'Not started'}
            </Badge>
          </div>
          <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">{layer.shortDescription}</p>
          {layer.userDetail && <p className="text-xs text-ink-600 mt-1.5 font-medium">{layer.userDetail}</p>}
        </div>
      </div>
    </div>
  );
}

function FraudAlertRow({ alert }: { alert: FraudAlert }) {
  const sevTone = alert.severity === 'high' ? 'red' : alert.severity === 'medium' ? 'amber' : 'slate';
  const statusTone = alert.status === 'under_review' ? 'amber' : alert.status === 'resolved' ? 'accent' : alert.status === 'dismissed' ? 'slate' : 'slate';
  return (
    <div className="border border-ink-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-800">{alert.type}</span>
        <div className="flex gap-1.5">
          <Badge tone={sevTone}>{alert.severity} severity</Badge>
          <Badge tone={statusTone}>{alert.status}</Badge>
        </div>
      </div>
      <p className="text-xs text-ink-600 mt-1">{alert.description}</p>
      <p className="text-xs text-ink-400 mt-1">Detected {alert.detectedAt}</p>
    </div>
  );
}

function ReviewRow({ review }: { review: CollaborationReview }) {
  const reviewer = getProfile(review.reviewerId);
  const reviewee = getProfile(review.revieweeId);
  return (
    <div className="border border-ink-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-800">{review.ventureTitle}</span>
        <Badge tone="brand">{review.at}</Badge>
      </div>
      <p className="text-xs text-ink-500 mt-1">
        {reviewer?.name ?? 'Unknown'} reviewed {reviewee?.name ?? 'Unknown'} ({review.periodStart} to {review.periodEnd})
      </p>
      <p className="text-sm text-ink-700 mt-2">{review.text}</p>
    </div>
  );
}

export function TrustCenterPage() {
  const { profiles, currentUserId, trust, submitAppeal } = useApp();
  const me = profiles.find((p) => p.id === currentUserId)!;
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealDecision, setAppealDecision] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealError, setAppealError] = useState<string | null>(null);

  const verifiedCount = me.verifications.filter((v) => v.state === 'verified').length;
  const pendingCount = me.verifications.filter((v) => v.state === 'pending').length;
  const outstanding = me.verifications.filter((v) => v.state !== 'verified');

  const layers = trust.trustLayers ?? [];
  const fraudAlerts = trust.fraudAlerts ?? [];
  const reviews = trust.collaborationReviews ?? [];

  return (
    <div>
      <PageHeader title="Trust Center" subtitle="Your verification, account standing, and safety." />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Account standing */}
          <Card className="p-5">
            <SectionHeader title="Account standing" />
            <div className="flex items-center gap-3">
              {trust.accountStanding === 'Good standing' ? <ShieldCheck className="w-10 h-10 text-accent-500" /> : <ShieldAlert className="w-10 h-10 text-amber-500" />}
              <div>
                <Badge tone={standingTone[trust.accountStanding]}>{trust.accountStanding}</Badge>
                <p className="text-sm text-ink-500 mt-1">{me.verifications.filter((v) => v.state === 'verified').length} verified claims</p>
              </div>
            </div>
          </Card>

          {/* Trust & Verification Architecture */}
          <Card className="p-5">
            <SectionHeader title="Trust & Verification Architecture" subtitle="Trust is built in layers — verifiable facts, not popularity or self-reported claims." />
            <div className="space-y-3">
              {layers.map((layer) => (
                <LayerCard key={layer.number} layer={layer} />
              ))}
            </div>
            <BetaNote>Layer statuses are mock data for this MVP. No real identity, phone, or third-party checks are performed.</BetaNote>
          </Card>

          {/* Claim-level verification status */}
          <Card className="p-5">
            <SectionHeader title="Claim-level verification" subtitle="Each claim is checked separately. Verification confirms facts — not opinions, character, or trustworthiness." />
            <div className="grid sm:grid-cols-2 gap-3">
              {me.verifications.map((v) => (
                <div key={v.id} className="border border-ink-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-800">{v.label}</span>
                    <VerificationPill state={v.state} />
                  </div>
                  {v.detail && <p className="text-xs text-ink-500 mt-1">{v.detail}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <div className="text-center"><div className="text-xl font-bold text-accent-600">{verifiedCount}</div><div className="text-xs text-ink-500">Verified</div></div>
              <div className="text-center"><div className="text-xl font-bold text-amber-500">{pendingCount}</div><div className="text-xs text-ink-500">Pending</div></div>
              <div className="text-center"><div className="text-xl font-bold text-ink-400">{outstanding.length}</div><div className="text-xs text-ink-500">Outstanding</div></div>
            </div>
          </Card>

          {/* Verification Timeline */}
          <Card className="p-5">
            <SectionHeader title="Verification timeline" subtitle="Chronological record of your verification events." />
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-ink-200" />
              {(trust.verificationTimeline ?? []).map((evt) => (
                <div key={evt.id} className="relative mb-4 last:mb-0">
                  <div className={`absolute -left-5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${evt.status === 'verified' ? 'bg-accent-500 border-accent-500' : evt.status === 'pending' ? 'bg-amber-400 border-amber-400' : 'bg-red-500 border-red-500'}`}>
                    {evt.status === 'verified' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="ml-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-900">{evt.label}</span>
                      <Badge tone={evt.status === 'verified' ? 'accent' : evt.status === 'pending' ? 'amber' : 'red'}>
                        {evt.status === 'verified' ? 'Verified' : evt.status === 'pending' ? 'Pending' : 'Failed'}
                      </Badge>
                    </div>
                    {evt.detail && <p className="text-xs text-ink-500 mt-0.5">{evt.detail}</p>}
                    <p className="text-xs text-ink-400 mt-0.5">{evt.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Collaboration Reviews */}
          <Card className="p-5">
            <SectionHeader title="Collaboration reviews" subtitle="Reviews are only written by verified participants of the same Collaboration Space. The platform verifies who wrote the review and that a real collaboration occurred — not the subjective opinions expressed." />
            {reviews.length === 0 ? <p className="text-sm text-ink-500">No collaboration reviews yet. Reviews appear after a verified collaboration ends.</p> : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <ReviewRow key={r.id} review={r} />
                ))}
              </div>
            )}
          </Card>

          {/* Fraud detection */}
          <Card className="p-5">
            <SectionHeader title="Trust & fraud detection" subtitle="The platform continuously monitors for suspicious behavior patterns." />
            <div className="space-y-2 text-xs text-ink-500 mb-4">
              <p className="flex items-start gap-2"><ScanSearch className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" /> Multiple newly created accounts reviewing one another.</p>
              <p className="flex items-start gap-2"><ScanSearch className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" /> Repeated fake collaboration patterns.</p>
              <p className="flex items-start gap-2"><ScanSearch className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" /> Large numbers of references without corresponding project activity.</p>
              <p className="flex items-start gap-2"><ScanSearch className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" /> Coordinated attempts to manipulate reputation.</p>
              <p className="flex items-start gap-2"><ScanSearch className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" /> Duplicate or fraudulent identities.</p>
              <p className="flex items-start gap-2"><ScanSearch className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" /> Unusual account creation or login behavior.</p>
            </div>
            <div className="text-xs text-ink-500 mb-3">Suspicious activity may trigger manual review, additional verification requests, temporary restrictions, suspension, or permanent removal for confirmed abuse.</div>
            {fraudAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-accent-700"><ShieldCheck className="w-4 h-4" /> No suspicious activity detected on your account.</div>
            ) : (
              <div className="space-y-2">
                {fraudAlerts.map((a) => (
                  <FraudAlertRow key={a.id} alert={a} />
                ))}
              </div>
            )}
            <BetaNote>Fraud detection is simulated in this MVP. No real monitoring is performed.</BetaNote>
          </Card>

          {/* Reports */}
          <Card className="p-5">
            <SectionHeader title="Reports you submitted" />
            {trust.reports.length === 0 ? <p className="text-sm text-ink-500">You have not submitted any reports.</p> : (
              <div className="space-y-2">
                {trust.reports.map((r) => (
                  <div key={r.id} className="border border-ink-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-800 capitalize">{r.targetType} report</span>
                      <Badge tone="amber">{r.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-600 mt-1">{r.reason}</p>
                    <p className="text-xs text-ink-400 mt-1">{new Date(r.at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Appeal */}
          <Card className="p-5">
            <SectionHeader title="Appeals" />
            <p className="text-sm text-ink-500 mb-3">If you believe a moderation decision was wrong, you can submit an appeal.</p>
            <button onClick={() => setShowAppeal(true)} className="btn-secondary"><FileWarning className="w-4 h-4" /> Submit appeal</button>
            {trust.appealStatus && <p className="text-sm text-ink-600 mt-2">Appeal status: {trust.appealStatus}</p>}
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionHeader title="Trust principles" />
            <div className="space-y-3 text-sm text-ink-600">
              <p className="font-medium text-ink-800">The platform verifies:</p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" /> Identity</li>
                <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" /> Participation</li>
                <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" /> Project history</li>
                <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" /> Verification claims</li>
                <li className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" /> Review authorship</li>
              </ul>
              <p className="font-medium text-ink-800 mt-3">The platform does not certify:</p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" /> That someone is a good partner</li>
                <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" /> Honesty, success, or trustworthiness</li>
              </ul>
              <p className="text-xs text-ink-500 mt-3 italic">Those judgments belong to users. The platform provides transparent, verifiable information to help you decide.</p>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Safety guidance" />
            <div className="space-y-2 text-sm text-ink-600">
              <p className="flex items-start gap-2"><Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" /> Verify claims before committing to collaborations.</p>
              <p className="flex items-start gap-2"><Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" /> Use Collaboration Records to align expectations.</p>
              <p className="flex items-start gap-2"><Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" /> Report concerns factually — do not publicly accuse others.</p>
              <p className="flex items-start gap-2"><Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" /> Keep sensitive details in private conversations.</p>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Moderation" />
            <p className="text-sm text-ink-600">Opportunity Network reserves the right to investigate, restrict, suspend, or terminate accounts to protect users, enforce policies, prevent fraud, or comply with legal obligations.</p>
            <div className="space-y-1.5 mt-3">
              {['Verification incomplete', 'Claim could not be verified', 'Account under review', 'Account restricted', 'Account suspended for policy violations'].map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs text-ink-500"><AlertTriangle className="w-3 h-3" /> {s}</div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Not legal advice" />
            <p className="text-sm text-ink-600">Collaboration Records and toolkit resources are for reference only and are not legal advice.</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-ink-400"><Scale className="w-4 h-4" /> Legal-template integrations are a future placeholder.</div>
          </Card>
        </div>
      </div>

      <Modal open={showAppeal} onClose={() => setShowAppeal(false)} title="Submit an appeal">
        <div className="space-y-3">
          <Field label="What decision are you appealing?"><textarea className="input min-h-[80px]" value={appealDecision} onChange={(event) => setAppealDecision(event.target.value)} placeholder="Describe the decision..." /></Field>
          <Field label="Why should it be reconsidered?"><textarea className="input min-h-[80px]" value={appealReason} onChange={(event) => setAppealReason(event.target.value)} placeholder="Provide factual context..." /></Field>
          {appealError && <p role="alert" className="text-sm text-red-600">{appealError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAppeal(false)} className="btn-secondary" disabled={appealSubmitting}>Cancel</button>
            <button onClick={async () => {
              setAppealSubmitting(true);
              setAppealError(null);
              try {
                await submitAppeal(appealDecision, appealReason);
                setAppealDecision('');
                setAppealReason('');
                setShowAppeal(false);
              } catch (error) {
                setAppealError(error instanceof Error ? error.message : 'Could not submit the appeal.');
              } finally {
                setAppealSubmitting(false);
              }
            }} disabled={appealSubmitting || appealDecision.trim().length < 5 || appealReason.trim().length < 10} className="btn-primary">{appealSubmitting ? 'Submitting...' : 'Submit'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
