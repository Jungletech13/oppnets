# OPPNETS TRUST CONSTITUTION
## Version 1.0

**Status: APPROVED — CONSTITUTIONAL**
**Document ID: GOV-001**
**Date: July 26, 2026**
**Authority Level: Constitutional — cannot be overridden by any implementation**

---

## PREAMBLE

Opportunity Network is a trust-first platform where people discover opportunities, find verified collaborators, build teams, and execute ventures together. Trust is the platform's core differentiator. This Constitution defines the permanent principles that govern how trust is earned, calculated, displayed, and protected. No implementation, feature, or business decision may violate these principles.

---

## ARTICLE I — TRUST IS EARNED, NOT BOUGHT

Trust signals on OppNets are earned through verified collaboration and verified facts. Money may never purchase, influence, or accelerate trust signals.

### Section 1.1 — Payment Independence
Subscriptions, payments, and entitlements do not affect trust calculations. The Trust Layer MUST NOT read subscription, entitlement, or payment tables for trust calculations. The Business Layer MUST NOT modify, influence, or calculate trust data.

### Section 1.2 — No Paid Trust
No plan tier, premium listing, sponsored placement, or paid feature may alter a user's trust signals, reputation, verification status, badges, or recommendations.

### Section 1.3 — Equal Trust Opportunity
Every user, regardless of plan, has the same ability to earn trust through verified collaboration and verified facts.

---

## ARTICLE II — TRUST THROUGH VERIFIED FACTS, NOT SCORES

OppNets does not display a single numeric trust score. Trust is presented through verified facts, earned badges, and contextual reputation that users can interpret themselves.

### Section 2.1 — No Aggregate Score
The platform MUST NOT calculate or display a single composite trust score for any user, professional, or company.

### Section 2.2 — Explainable Signals
Every trust signal (badge, reputation summary, recommendation) MUST be explainable. Users MUST be able to see the underlying facts that produced each signal.

### Section 2.3 — Factual Basis
Trust signals are derived from verified collaboration records, published reviews from verified co-participants, and earned badges. Subjective opinions without factual basis do not produce trust signals.

---

## ARTICLE III — AI RECOMMENDS, PEOPLE DECIDE

AI and automated systems may recommend, suggest, and surface — but never decide. Final decisions about collaboration, trust, and opportunity participation always rest with people.

### Section 3.1 — Recommendation Transparency
AI-generated recommendations MUST be labeled as recommendations and MUST include the signals that informed them.

### Section 3.2 — No Automated Trust Decisions
No automated system may make a final trust determination. Admin review is required for verification approval, fraud resolution, and appeal outcomes.

### Section 3.3 — Dismissible Recommendations
Users MUST be able to dismiss any AI-generated recommendation.

---

## ARTICLE IV — COLLABORATION OVER CONTENT

The platform prioritizes verified collaboration over content production. Trust is built through working together, not through posting, liking, or following.

### Section 4.1 — Collaboration as Trust Source
The primary source of trust is verified collaboration within Collaboration Spaces. Reviews are only eligible from verified co-participants.

### Section 4.2 — No Social Metrics as Trust
Followers, likes, post counts, and other social engagement metrics MUST NOT factor into trust calculations.

---

## ARTICLE V — TRANSPARENCY AND APPEAL

Every trust-affecting decision is transparent and appealable. Users have the right to understand and challenge trust-affecting outcomes.

### Section 5.1 — Audit Trail
Every trust decision (verification, badge award, fraud alert, review publication) MUST be recorded in an immutable audit log.

### Section 5.2 — Appeal Right
Users MAY appeal any trust-affecting decision. The appeal workflow MUST be available in the platform UI.

### Section 5.3 — User Access to Trust Data
Users MAY view their own trust data, including the facts and signals that contribute to their trust profile.

---

## ARTICLE VI — LAYER SEPARATION

The Trust Layer is a platform service with strict boundaries. It serves the Marketplace Layer through read-only APIs but is governed by this Constitution, not by marketplace or business needs.

### Section 6.1 — Trust Layer Independence
The Trust Layer MUST NOT be modified by the Business Layer or Marketplace Layer. All trust mutations go through Trust Layer RPCs.

### Section 6.2 — No Local Trust Calculation
The Marketplace Layer MUST NOT calculate trust signals locally. All trust signals come from Trust Layer APIs.

### Section 6.3 — Read-Only Marketplace Access
The Marketplace Layer reads trust signals via Trust APIs. It MUST NOT write to trust tables directly.

---

## ARTICLE VII — FRAUD PROTECTION

The platform actively detects and surfaces fraud patterns to protect users. Fraud detection is a trust function, not a business function.

### Section 7.1 — Fraud Detection Independence
Fraud detection MUST NOT be influenced by subscription status, payment history, or plan tier.

### Section 7.2 — Fraud Visibility
Users MAY view fraud alerts related to their account. Admins MAY investigate and resolve fraud alerts.

### Section 7.3 — No Fraud Suppression
No payment, subscription, or business consideration may suppress or downgrade a fraud alert.

---

## ARTICLE VIII — AMENDMENT

This Constitution may only be amended by the Founder. Amendments MUST be versioned, documented, and dated. Once amended, the previous version remains in the canon for historical reference.

### Section 8.1 — Amendment Process
1. Founder proposes amendment
2. Amendment is documented with version increment
3. Founder approves amendment
4. New version is added to the canon
5. Implementation is updated to comply

### Section 8.2 — No Silent Amendment
No implementation may silently violate or reinterpret this Constitution. Any conflict between implementation and Constitution MUST be resolved by changing the implementation, not the Constitution.

---

## CONSTITUTIONAL PROHIBITIONS SUMMARY

| Prohibition | Enforced By |
|---|---|
| Business Layer may not modify Trust Layer | RLS policies, RPC boundaries |
| Trust Layer may not read payment data for calculations | Architectural separation |
| Marketplace may not write trust data directly | RLS policies |
| Marketplace may not calculate trust locally | API-only access pattern |
| No paid trust signals | Constitutional constraint |
| No single numeric trust score | UI and API constraints |
| No automated final trust decisions | Admin review requirement |
| No social metrics in trust calculations | Calculation scope |
| No fraud suppression by payment | Fraud detection independence |

---

**END OF DOCUMENT — OPPNETS TRUST CONSTITUTION VERSION 1.0**
**This document is constitutional. It cannot be overridden by any implementation.**
