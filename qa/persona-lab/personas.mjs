const cohortSpecs = [
  ['creator', 18, ['nontechnical founder', 'experienced operator', 'nonprofit organizer', 'local business builder', 'creative producer']],
  ['collaborator', 18, ['developer', 'designer', 'marketer', 'operator', 'finance contributor', 'community volunteer']],
  ['team-lead', 12, ['frequent pair lead', 'established group lead', 'user-created team lead']],
  ['professional', 10, ['accounting provider', 'marketing provider', 'software provider', 'design provider', 'operations provider']],
  ['company-representative', 8, ['small business representative', 'startup representative', 'nonprofit representative', 'agency representative']],
  ['trust-safety', 8, ['incomplete profile user', 'reporter', 'reported user', 'verification claimant', 'appeal requester']],
  ['accessibility', 8, ['keyboard-only user', 'screen-reader user', 'low-vision user', 'reduced-motion user', 'cognitive-simplicity user', 'motor-limited user']],
  ['device-network', 8, ['small-mobile user', 'tablet user', 'slow-network user', 'intermittent-network user']],
  ['membership', 6, ['free member', 'trial member', 'active member', 'past-due member', 'canceling member', 'expired member']],
  ['admin', 4, ['support admin', 'verification admin', 'moderation admin', 'subscription admin']],
];

const viewports = ['390x844', '360x640', '768x1024', '1440x900'];
const memberships = ['free', 'trial', 'active', 'past_due', 'cancel_at_period_end', 'expired'];
const patience = ['low', 'medium', 'high'];
const decisionStyles = ['evidence-first', 'relationship-first', 'speed-first', 'risk-averse', 'exploratory'];
const communicationStyles = ['direct', 'encouraging', 'skeptical', 'detail-oriented', 'plain-language'];
const motivations = [
  'find a trustworthy collaborator without wasting time',
  'turn a promising idea into a concrete next step',
  'understand exactly why a person or opportunity is credible',
  'coordinate work without adding another noisy social feed',
  'protect limited time and avoid unclear commitments',
];
const trustConcerns = [
  'unclear identity or work-history claims',
  'hidden fees or plan limitations',
  'messages or applications disappearing',
  'unclear ownership and decision authority',
  'reporting a problem without visible follow-through',
];
const goalByCohort = {
  creator: 'Publish an opportunity and form a collaboration space',
  collaborator: 'Find a credible opportunity and contact its creator',
  'team-lead': 'Present a proven team and coordinate shared work',
  professional: 'List services and respond to a qualified inquiry',
  'company-representative': 'Maintain a company presence and recruit collaborators',
  'trust-safety': 'Understand verification and complete a safe report or appeal flow',
  accessibility: 'Complete core workflows using the assigned accessibility mode',
  'device-network': 'Complete core workflows under device or network constraints',
  membership: 'Understand plan status and available entitlements',
  admin: 'Review synthetic cases with an auditable reason',
};

let sequence = 0;
export const personas = cohortSpecs.flatMap(([cohort, count, archetypes], cohortIndex) =>
  Array.from({ length: count }, (_, withinCohort) => {
    sequence += 1;
    const id = `persona-${String(sequence).padStart(3, '0')}`;
    return {
      persona_id: id,
      synthetic: true,
      test_email: `${id}@example.test`,
      display_name: `Synthetic Tester ${String(sequence).padStart(3, '0')}`,
      cohort,
      archetype: archetypes[withinCohort % archetypes.length],
      skill_level: ['new', 'intermediate', 'advanced'][(sequence + cohortIndex) % 3],
      viewport: viewports[(sequence + cohortIndex) % viewports.length],
      accessibility_mode: cohort === 'accessibility' ? archetypes[withinCohort % archetypes.length] : 'standard',
      membership: cohort === 'membership' ? memberships[withinCohort] : memberships[sequence % 3 === 0 ? 2 : 0],
      trust_state: cohort === 'trust-safety' ? ['incomplete', 'neutral', 'under_review', 'good_standing'][withinCohort % 4] : 'neutral',
      location_mode: sequence % 2 === 0 ? 'remote' : 'local',
      patience: patience[sequence % patience.length],
      personality: {
        decision_style: decisionStyles[(sequence + cohortIndex) % decisionStyles.length],
        communication_style: communicationStyles[(sequence * 2 + cohortIndex) % communicationStyles.length],
        motivation: motivations[(sequence * 3 + cohortIndex) % motivations.length],
        trust_concern: trustConcerns[(sequence * 4 + cohortIndex) % trustConcerns.length],
        change_tolerance: ['low', 'medium', 'high'][(sequence + withinCohort) % 3],
      },
      primary_goal: goalByCohort[cohort],
      prohibited_actions: ['production access', 'real payment', 'real identity upload', 'external message delivery'],
    };
  }),
);

if (personas.length !== 100) throw new Error(`Fixture construction error: expected 100 personas, got ${personas.length}`);
