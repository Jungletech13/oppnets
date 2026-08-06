# OPPNETS TRUST ENGINE IMPLEMENTATION PLAN
## Version 1.0

**Status: APPROVED — IMPLEMENTATION GUIDE**
**Document ID: GOV-002**
**Date: July 26, 2026**
**Authority Level: Implementation Guide — may be revised without amending the Constitution**
**Governing Document: GOV-001 OppNets Trust Constitution v1.0**

---

## PURPOSE

This plan defines the phase-by-phase implementation of the OppNets Trust Engine. Each phase is designed to be independently shippable, independently rollback-able, and non-destructive to existing data. All phases comply with the Trust Constitution (GOV-001).

---

## CURRENT STATE

The Trust Layer currently has basic Phase 1 tables and a conceptual Trust Center page:

| Component | Current State |
|---|---|
| Verification claims | User-created claims with pending/verified/failed states. No admin review workflow. |
| Verification timeline | User-created timeline events. No system-generated events. |
| Collaboration reviews | Free-for-all reviews gated only by space membership. No eligibility, no lifecycle, no double-blind. |
| Fraud alerts | User-scoped alerts with severity and status. No system detection, no investigation workflow. |
| Community standing | Manual text field on profiles. Not calculated. |
| Trust Center page | Displays 6-layer trust system conceptually. Not backed by calculated data. |
| Admin audit log | Operational (Phase 3.1). Immutable, append-only. Reused for trust audit. |
| Admin notes | Operational (Phase 3.1). Reused for trust investigations. |

---

## IMPLEMENTATION PHASES

### Phase 4.1 — Trust Foundation

**Purpose:** Establish the foundational trust schema that all subsequent phases depend on.

**New Tables:**
- `trust_audit_records` — Immutable record of every trust decision (verification, badge, fraud, appeal)
- `trust_event_log` — Chronological log of trust-affecting events (system-generated)
- `trust_config` — Configuration table for trust thresholds, badge criteria, reputation weights

**Key Decisions:**
- Trust audit is separate from admin audit (different concerns, different retention)
- Trust config is admin-managed, not hardcoded
- No existing tables modified
- No existing data touched

**Unblocks:** Phases 4.2 through 4.9

---

### Phase 4.2 — Verified Collaboration Engine

**Purpose:** Automatically verify that two users collaborated within a Collaboration Space based on objective criteria.

**New Tables:**
- `verified_collaborations` — System-generated records proving two users worked together

**Key Decisions:**
- Verification criteria: shared space membership + minimum activity threshold (tasks completed, decisions participated, check-ins attended)
- System-generated, not user-created
- Read-only for users; write access via RPC only
- Foundation for review eligibility (Phase 4.3)

---

### Phase 4.3 — Eligibility Engine

**Purpose:** Determine which users are eligible to review which other users based on verified collaboration.

**New Tables:**
- `review_eligibility` — Records of who may review whom, with eligibility window

**Key Decisions:**
- Eligibility requires a verified collaboration (Phase 4.2)
- Eligibility has a time window (e.g., 90 days after collaboration ends)
- One eligibility record per reviewer-reviewee pair per collaboration
- Eligibility expires automatically

---

### Phase 4.4 — Review Engine

**Purpose:** Replace free-for-all reviews with lifecycle-managed, eligibility-gated reviews.

**New Tables:**
- `trust_reviews` — Reviews with lifecycle (draft, submitted, published, disputed)

**Key Decisions:**
- Migrate `collaboration_reviews` data to `trust_reviews`
- Review lifecycle: draft → submitted → published (or → disputed → resolved)
- Only eligible users (Phase 4.3) may create reviews
- Reviews require verified collaboration context
- Old `collaboration_reviews` table retained for migration audit trail

---

### Phase 4.5 — Double-Blind Review Publication

**Purpose:** Protect reviewers and reviewees by hiding author identity until both parties have published.

**Key Decisions:**
- No new tables — alters `trust_reviews`
- Reviewer identity hidden until BOTH reviewer and reviewee have published reviews for the same collaboration
- Once both published, identities revealed
- If only one publishes, identity remains hidden permanently
- Prevents retaliation and reciprocal review bias

---

### Phase 4.6 — Reputation Engine

**Purpose:** Calculate reputation summaries from published reviews and earned badges.

**New Tables:**
- `reputation_summaries` — Calculated reputation per user (contextual, not a single score)
- `reputation_history` — Historical reputation snapshots for trend analysis

**Key Decisions:**
- Reputation is contextual (per industry, per collaboration type), not a single score
- Calculated from: published reviews, earned badges, verified collaborations count
- Recalculated on review publication, badge award, collaboration verification
- Constitutional compliance: no single numeric score (Article II)

---

### Phase 4.7 — Badge Engine

**Purpose:** Automatically award trust badges based on verified facts.

**New Tables:**
- `badge_definitions` — Admin-managed badge criteria (e.g., "First Collaboration", "10 Verified Collaborations", "Early Builder")
- `trust_badges` — Earned badges per user

**Key Decisions:**
- Badges are system-calculated, not user-requested
- Badge criteria defined in `badge_definitions` (admin-managed via `trust_config`)
- Badges are explainable — users can see why each badge was awarded
- Badges factor into reputation (Phase 4.6)

---

### Phase 4.8 — Recommendation Engine

**Purpose:** Generate explainable, signal-based recommendations for collaborators and opportunities.

**New Tables:**
- `trust_recommendations` — Recommendations per user (collaborator suggestions, opportunity matches)
- `recommendation_signals` — The signals that informed each recommendation

**Key Decisions:**
- Recommendations are labeled as recommendations (Constitution Article III)
- Each recommendation includes its signals (explainable)
- Users can dismiss recommendations (Constitution Article III)
- Signals include: verified collaboration history, shared industries, complementary skills, reputation context
- No automated final decisions (Constitution Article III)

---

### Phase 4.9 — Fraud Detection

**Purpose:** Detect fraud patterns and manage investigation workflows.

**New Tables:**
- `trust_fraud_alerts` — System-detected fraud alerts (migrate from `fraud_alerts`)
- `trust_investigations` — Investigation workflow for fraud alerts

**Key Decisions:**
- Migrate `fraud_alerts` data to `trust_fraud_alerts`
- System detection: pattern-based (multiple accounts, fake collaborations, review bombing)
- Investigation workflow: detected → under_review → resolved (or dismissed)
- Admin review required for resolution (Constitution Article III)
- Fraud detection independent of payment status (Constitution Article VII)
- Old `fraud_alerts` table retained for migration audit trail

---

## PHASE DEPENDENCY GRAPH

```
4.1 Trust Foundation
  ├── 4.2 Verified Collaboration Engine
  │     └── 4.3 Eligibility Engine
  │           └── 4.4 Review Engine
  │                 └── 4.5 Double-Blind Review Publication
  │                       └── 4.6 Reputation Engine
  ├── 4.7 Badge Engine
  │     └── 4.6 Reputation Engine (badges feed reputation)
  ├── 4.8 Recommendation Engine (depends on reputation + badges)
  └── 4.9 Fraud Detection (depends on verified collaborations)
```

---

## CONSTITUTIONAL COMPLIANCE CHECK

| Constitution Article | How This Plan Complies |
|---|---|
| Article I — Trust is Earned, Not Bought | No phase reads payment data. No phase allows paid trust. |
| Article II — Verified Facts, Not Scores | Phase 4.6 produces contextual reputation, not a single score. |
| Article III — AI Recommends, People Decide | Phase 4.8 labels recommendations and requires admin review for fraud. |
| Article IV — Collaboration Over Content | Phase 4.2 verifies collaboration. Phase 4.3 gates reviews on collaboration. |
| Article V — Transparency and Appeal | Phase 4.1 creates audit records. Phase 4.9 includes appeal workflow. |
| Article VI — Layer Separation | All phases use RPC boundaries. Marketplace reads via APIs only. |
| Article VII — Fraud Protection | Phase 4.9 is independent of payment status. |

---

## ROLLBACK SAFETY

Each phase is designed to be independently rollback-able:
- New tables can be dropped without affecting existing functionality
- Data migrations (4.4, 4.9) retain old tables for audit trail
- No phase modifies existing table columns destructively
- No phase deletes existing data

---

**END OF DOCUMENT — OPPNETS TRUST ENGINE IMPLEMENTATION PLAN VERSION 1.0**
**This document is an implementation guide. It may be revised without amending the Constitution.**
