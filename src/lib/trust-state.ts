import type { TrustState } from '@/types';

const trustLayers: TrustState['trustLayers'] = [
  { number: 1, name: 'Email Verification', shortDescription: 'Confirms control of a valid email address. It does not verify identity or experience.', detail: 'Confirms control of a valid email address — not identity or experience.', userStatus: 'unverified' },
  { number: 2, name: 'Phone Verification', shortDescription: 'Confirms ownership of a valid phone number as an additional account security measure.', detail: 'Additional account security measure.', userStatus: 'unverified' },
  { number: 3, name: 'Identity Verification', shortDescription: 'Third-party verification can confirm identity, but not character, ability, or trustworthiness.', detail: 'Third-party identity verification. Confirms identity — not character, ability, or trustworthiness.', userStatus: 'unverified' },
  { number: 4, name: 'Verified Collaboration', shortDescription: 'Earned only from platform evidence such as verified membership and completed work.', detail: 'Earned through platform evidence — not self-declared.', userStatus: 'unverified' },
  { number: 5, name: 'Collaboration Reviews', shortDescription: 'Reviews are accepted only from verified participants in the same Collaboration Space.', detail: 'Only verified co-participants can review.', userStatus: 'unverified' },
  { number: 6, name: 'Trust & Fraud Detection', shortDescription: 'Monitors suspicious behavior and may trigger manual review or account restrictions.', detail: 'Continuous monitoring for suspicious behavior patterns.', userStatus: 'unverified' },
];

export function createEmptyTrustState(): TrustState {
  return {
    accountStanding: 'Verification incomplete',
    reports: [],
    appealStatus: undefined,
    safetyGuidanceRead: false,
    fraudAlerts: [],
    collaborationReviews: [],
    trustLayers: trustLayers.map((layer) => ({ ...layer })),
    verificationTimeline: [],
  };
}
