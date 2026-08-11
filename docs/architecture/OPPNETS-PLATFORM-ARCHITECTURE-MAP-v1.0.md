# OPPNETS PLATFORM ARCHITECTURE MAP
## Version 1.0 with August 6, 2026 Infrastructure Amendment

**Status: GOVERNING ARCHITECTURE DOCUMENT**
**Date: July 26, 2026**
**Document ID: GOV-003**
**Purpose: Map every completed system, approved document, and planned component into the platform architecture**

---

## PLATFORM OVERVIEW

OppNets is a six-layer platform. Each layer has a distinct mission, distinct responsibilities, and strict boundaries on what it may communicate with. Layers are ordered from highest authority (Founder Governance) to lowest (Infrastructure). A higher layer may set policy for a lower layer. A lower layer may never modify a higher layer.

```
┌─────────────────────────────────────────────┐
│         FOUNDER GOVERNANCE LAYER              │  Authority: Constitutional
│  Constitutions, Policies, Approval Documents  │
└──────────────────┬──────────────────────────┘
                   │ governs
┌──────────────────▼──────────────────────────┐
│              TRUST LAYER                      │  Authority: Platform Service
│  Verification, Reviews, Badges, Reputation,   │
│  Recommendations, Fraud, Appeals             │
└──────────────────┬──────────────────────────┘
                   │ serves
┌──────────────────▼──────────────────────────┐
│             BUSINESS LAYER                    │  Authority: Commerce
│  Subscriptions, Plans, Entitlements, Seats,   │
│  Professionals, Companies, Unlocks           │
└──────────────────┬──────────────────────────┘
                   │ supports
┌──────────────────▼──────────────────────────┐
│           MARKETPLACE LAYER                   │  Authority: User Activity
│  Opportunities, Collaboration, People,        │
│  Professionals, Companies, Messaging, Search  │
└──────────────────┬──────────────────────────┘
                   │ runs on
┌──────────────────▼──────────────────────────┐
│             PLATFORM LAYER                    │  Authority: Engineering
│  Auth, Database, RLS, RPC, Storage,           │
│  Realtime, Edge Functions, Auditing           │
└──────────────────┬──────────────────────────┘
                   │ hosted on
┌──────────────────▼──────────────────────────┐
│            INFRASTRUCTURE LAYER               │  Authority: Operations
│ GitHub, Cloudflare, Supabase, Resend, Stripe  │
└─────────────────────────────────────────────┘
```

---

## LAYER 1 — FOUNDER GOVERNANCE

### Mission

Establish the permanent principles, policies, and approval records that govern every layer below. The Founder Governance Layer is the highest authority in the platform. It does not execute code — it constrains and authorizes the code that other layers execute.

### Responsibilities

- Define constitutional principles that cannot be overridden by implementation
- Approve pricing, subscription, and monetization architecture before implementation
- Approve trust system architecture before implementation
- Define prohibited dependencies between layers
- Maintain the canon of approved documents
- Authorize new implementation phases

### Existing Documents

| Document ID | Document Name | Version | Status | Authority Level |
|---|---|---|---|---|
| GOV-001 | OppNets Trust Constitution | 1.0 | Approved | Constitutional |
| GOV-002 | Trust Engine Implementation Plan | 1.0 | Approved | Implementation Guide |
| GOV-003 | Platform Architecture Map | 1.0 | This document | Architecture Reference |
| GOV-004 | Phase 3.1 Admin Foundation | — | Implemented | Implementation Record |
| GOV-005 | Phase 3.2 Subscription Foundation | — | Implemented | Implementation Record |
| GOV-006 | Phase 3.2A Subscription Security Correction | — | Implemented | Implementation Record |

### Constitutional vs Implementation Guide

| Document | Classification | Meaning |
|---|---|---|
| Trust Constitution | Constitutional | Cannot be violated by any implementation. Any feature that conflicts must be redesigned or rejected. |
| Trust Implementation Plan | Implementation Guide | Provides the phase-by-phase plan. May be revised without amending the constitution. |
| Platform Architecture Map | Architecture Reference | Maps what exists and what is planned. Updated as implementation progresses. |
| Phase 3.x Records | Implementation Records | Document what was built and approved. Historical reference. |

### Existing Implementation

None — this layer is documentation only. It produces no code, no migrations, no database objects.

### Existing Database Objects

None.

### Existing Services

None.

### Existing RPCs

None.

### Existing UI

None.

### Planned Work

| Item | Status |
|---|---|
| Founder Pricing Approval document | Referenced in subscription architecture — not yet formalized as standalone document |
| Admin Governance document | Referenced in admin foundation — not yet formalized as standalone document |
| Pricing Blueprint | Referenced in subscription architecture — not yet formalized as standalone document |
| Subscription Architecture | Referenced in Phase 3.2 — not yet formalized as standalone document |

### Dependencies

- Depends on: Nothing (highest authority)
- Governs: All layers below

### Future Phases

- Formalize referenced governance documents (Pricing Approval, Admin Governance, Pricing Blueprint, Subscription Architecture) as standalone canon entries
- Establish amendment process for constitutional documents
- Define founder approval workflow for future phases

---

## LAYER 2 — TRUST LAYER

### Mission

Help users make better decisions by presenting earned, explainable, and auditable trust signals. The Trust Layer is a platform service that calculates, stores, and exposes trust data. It is governed by the Trust Constitution (GOV-001) and implemented per the Trust Engine Implementation Plan (GOV-002).

### Responsibilities

- Record verified collaboration facts
- Generate review eligibility from verified collaboration
- Manage review lifecycle (draft, submitted, published, disputed)
- Enforce double-blind review publication
- Calculate reputation summaries from published reviews and earned badges
- Calculate trust badges from verified facts
- Generate explainable recommendations
- Detect fraud patterns
- Manage appeal workflows
- Audit every trust decision immutably

### Existing Implementation

| Component | Status | Notes |
|---|---|---|
| Verification claims (basic) | Operational | User-created claims with pending/verified/failed states. No admin review workflow yet. |
| Verification timeline (basic) | Operational | User-created timeline events. System-generated events not yet implemented. |
| Collaboration reviews (basic) | Operational | Free-for-all reviews gated only by space membership. No eligibility, no lifecycle, no double-blind. |
| Fraud alerts (basic) | Operational | User-scoped alerts with severity and status. No system detection, no investigation workflow. |
| Community standing field | Operational | Manual text field on profiles (positive/neutral/monitoring). Not calculated. |
| Trust Center page | Operational | Displays 6-layer trust system conceptually. Not backed by calculated data. |

### Existing Database Objects

| Table | Schema | Purpose | Trust Layer Status |
|---|---|---|---|
| `verification_claims` | Phase 1 | User verification claims | Existing — needs admin workflow modification |
| `verification_timeline` | Phase 1 | Verification event log | Existing — needs system-only modification |
| `collaboration_reviews` | Phase 1 | Space-member reviews | Existing — needs lifecycle + double-blind overhaul |
| `fraud_alerts` | Phase 1 | Fraud alerts | Existing — needs detection + investigation workflow |
| `profiles.community_standing` | Phase 1 | Manual standing field | Existing — needs calculated replacement |
| `admin_audit_log` | Phase 3.1 | Immutable admin audit | Existing — reused for trust audit |
| `admin_notes` | Phase 3.1 | Admin investigation notes | Existing — reused for trust investigations |

### Existing Services

None — no Edge Functions deployed for trust calculations.

### Existing RPCs

| Function | Source | Purpose |
|---|---|---|
| `is_admin()` | Phase 3.1 | Admin role check — reused by trust admin RPCs |
| `_admin_audit()` | Phase 3.1 | Admin audit helper — extended for trust actions |

### Existing UI

| Page | Trust Content | Status |
|---|---|---|
| TrustCenterPage | 6-layer trust system, verification timeline, collaboration reviews, fraud alerts, community standing | Operational — conceptual, not backed by calculated trust data |
| ProfilePage | Verification badges, collaboration history | Operational — displays basic verification claims |
| PeoplePage | Trust indicators in person cards | Operational — basic |
| HomePage | Recommended collaborators | Operational — demo data, not trust-calculated |

### Existing Documents

| Document | Relevance |
|---|---|
| GOV-001 Trust Constitution | Governs all trust layer work |
| GOV-002 Trust Implementation Plan | Defines 9 implementation phases (4.1–4.9) |

### Planned Work — Trust Engine Phases

| Phase | Name | New Tables | Status |
|---|---|---|---|
| 4.1 | Trust Foundation | 3 (trust_audit_records, trust_event_log, trust_config) | Planned |
| 4.2 | Verified Collaboration Engine | 1 (verified_collaborations) | Planned |
| 4.3 | Eligibility Engine | 1 (review_eligibility) | Planned |
| 4.4 | Review Engine | 1 (trust_reviews) — migrate collaboration_reviews | Planned |
| 4.5 | Double-Blind Review Publication | 0 — alter trust_reviews | Planned |
| 4.6 | Reputation Engine | 2 (reputation_summaries, reputation_history) | Planned |
| 4.7 | Badge Engine | 2 (badge_definitions, trust_badges) | Planned |
| 4.8 | Recommendation Engine | 2 (trust_recommendations, recommendation_signals) | Planned |
| 4.9 | Fraud Detection | 2 (trust_fraud_alerts, trust_investigations) — migrate fraud_alerts | Planned |

### Trust Layer Component Map

| Component | Existing | Planned (4.x) | Future |
|---|---|---|---|
| Verification | Basic user claims | Admin review workflow, evidence storage | Automated verification, third-party verification providers |
| Eligibility | None | System-generated from verified collaboration | Cross-space eligibility, multi-party eligibility |
| Reviews | Free-for-all, space-gated | Lifecycle, double-blind, eligibility-gated | Review weighting, review decay, contextual reviews |
| Reputation | Manual community_standing field | Calculated from reviews + badges + collaborations | Reputation trends, contextual reputation, reputation export |
| Badges | None (display only) | System-calculated from verified facts | Badge categories, badge progression, public badge criteria |
| Recommendations | Demo data | Explainable, signal-based, dismissible | ML-assisted matching, preference learning, collaborative filtering |
| Fraud | Basic user-scoped alerts | System detection, investigation workflow | Pattern ML, cross-platform fraud signals, automated response |
| Appeals | None | Appeal state machine, admin resolution | Multi-level appeals, external review, appeal precedent |

### Dependencies

- Depends on: Founder Governance Layer (constitutional constraints), Platform Layer (database, RLS, RPC, auditing)
- Reads from: Marketplace Layer (collaboration_spaces, space_members, tasks, activity_log, opportunity_applications) — read-only
- MUST NOT read from: Business Layer (subscription, entitlement, payment tables) — constitutional prohibition
- Serves: Marketplace Layer (trust signals displayed in marketplace UI)

### Future Phases

- Phase 4.10+: Trust analytics dashboard for builders
- Phase 4.11+: Trust analytics dashboard for professionals
- Phase 4.12+: Public trust API (read-only, for external verification)
- Phase 4.13+: Trust export (users can export their trust data)
- Phase 4.14+: Trust portability (import trust from other platforms)

---

## LAYER 3 — BUSINESS LAYER

### Mission

Manage all commerce and account-tier functionality: subscriptions, plans, entitlements, company seats, professional accounts, and unlocks. The Business Layer handles money and access — never trust.

### Responsibilities

- Manage subscription plans and pricing
- Track user subscriptions and plan assignments
- Enforce plan entitlements (features available per plan)
- Manage company seats and seat assignments
- Manage professional account features (premium, sponsored)
- Process unlocks (paid actions)
- Integrate with Stripe for payment processing (future)

### Existing Implementation

| Component | Status | Notes |
|---|---|---|
| Subscription plans | Operational | 4 plans: Builder Free, Builder Pro, Professional, Company |
| Plan entitlements | Operational | Feature flags per plan |
| User subscriptions | Operational | Tracks current plan per user |
| Company seats | Operational | Seat capacity per company subscription |
| Seat assignments | Operational | Users assigned to company seats |
| Subscription cost factors | Operational | Pricing configuration |
| Pricing page | Operational | Displays 4 plans with features |
| Admin subscription management | Operational | Admin can view/manage subscriptions |

### Existing Database Objects

| Table | Schema | Purpose |
|---|---|---|
| `subscription_plans` | Phase 3.2 | Plan definitions (Builder Free, Builder Pro, Professional, Company) |
| `plan_entitlements` | Phase 3.2 | Feature entitlements per plan |
| `user_subscriptions` | Phase 3.2 | Current subscription per user |
| `company_seats` | Phase 3.2 | Seat capacity for company plans |
| `seat_assignments` | Phase 3.2 | Users assigned to company seats |
| `subscription_cost_factors` | Phase 3.2 | Pricing configuration |
| `professionals` | Phase 2 | Professional profiles (premium, sponsored flags) |
| `companies` | Phase 2 | Company profiles (owner, verified flag) |

### Existing Services

None — no Edge Functions for billing or subscription management.

### Existing RPCs

| Function | Source | Purpose |
|---|---|---|
| `is_company_member()` | Phase 3.1 | Company membership check |
| Subscription admin RPCs | Phase 3.2 | Admin subscription management |

### Existing UI

| Page | Business Content | Status |
|---|---|---|
| PricingPage | 4 plans, feature comparison, CTA | Operational |
| SettingsPage | Current plan display | Operational |
| AdminSubscriptionsPage | Subscription management | Operational |
| ProfessionalsPage | Premium/sponsored labels | Operational |
| CompaniesPage | Company profile management | Operational |

### Existing Documents

| Document | Relevance |
|---|---|
| Phase 3.2 Subscription Foundation | Implementation record for subscription architecture |
| Phase 3.2A Security Correction | RLS correction for subscription tables |

### Planned Work

| Item | Status |
|---|---|
| Stripe integration (payment processing) | Future — architecture only, no processing yet |
| Billing history | Planned |
| Invoice generation | Planned |
| Proration handling | Planned |
| Subscription upgrades/downgrades | Planned |
| Professional premium placement | Planned |
| Sponsored listing management | Planned |
| Unlock system (paid one-time actions) | Planned |

### Dependencies

- Depends on: Founder Governance Layer (pricing approval), Platform Layer (database, RLS, RPC)
- MUST NOT modify: Trust Layer (constitutional prohibition)
- MUST NOT be read by: Trust Layer (constitutional prohibition)
- Serves: Marketplace Layer (entitlements gate marketplace features)

### Future Phases

- Phase 5.x: Stripe payment processing
- Phase 5.x: Billing and invoicing
- Phase 5.x: Unlock system
- Phase 5.x: Professional premium placement
- Phase 5.x: Sponsored listing management

---

## LAYER 4 — MARKETPLACE LAYER

### Mission

Provide the user-facing activity surface: discovering opportunities, finding collaborators, building teams, working in collaboration spaces, hiring professionals, growing companies, and sharing success stories. The Marketplace Layer is where users act. Trust signals from the Trust Layer inform those actions.

### Responsibilities

- Opportunity discovery, creation, and management
- People directory and builder search
- Professional marketplace directory and search
- Company directory and company pages
- Collaboration spaces (tasks, milestones, files, decisions, activity)
- Messaging and conversations
- Notifications
- Success stories
- Resource center
- Builder partners directory

### Existing Implementation

| Component | Status | Notes |
|---|---|---|
| Opportunity discovery + filters | Operational | Category, stage, location, remote, compensation, time commitment |
| Opportunity creation wizard | Operational | 5-step wizard with localStorage draft saving |
| Opportunity detail page | Operational | Full view with roles, DNA, owner profile, apply flow |
| My opportunities | Operational | User's posted opportunities |
| People directory | Operational | Filtering by skills, industry, verification, location |
| Professional marketplace | Operational | Directory with filtering by service, industry, location |
| Professional detail | Operational | Full professional profile with reviews |
| Company directory | Operational | Search by industry, size, services |
| Company detail | Operational | Company page with overview, services, reviews |
| Collaboration spaces | Operational | Tasks, milestones, files, decisions, activity log, check-ins |
| Messaging | Operational | Conversations with collaboration context bar |
| Notifications | Operational | Split: Requires Action + Informational Updates |
| Success stories | Operational | Public success story display |
| Resource center | Operational | Article hub with categories |
| Builder partners | Operational | Partner directory by category |
| Pricing page | Operational | 4 plans with feature comparison |
| Landing page | Operational | Public marketing page |
| Auth page | Operational | Email/password sign-in and sign-up |

### Existing Database Objects

| Table | Schema | Purpose |
|---|---|---|
| `profiles` | Phase 1 | Extended user profiles |
| `opportunities` | Phase 1 | Posted opportunities |
| `opportunity_roles` | Phase 1 | Roles within opportunities |
| `collaboration_spaces` | Phase 1 | Project workspaces |
| `space_members` | Phase 1 | Space membership |
| `tasks` | Phase 1 | Tasks within spaces |
| `checklist_items` | Phase 1 | Task checklists |
| `milestones` | Phase 1 | Project milestones |
| `space_files` | Phase 1 | Files in spaces |
| `decisions` | Phase 1 | Decision log |
| `activity_log` | Phase 1 | Space activity feed |
| `conversations` | Phase 1 | Message threads |
| `conversation_participants` | Phase 1 | Conversation membership |
| `messages` | Phase 1 | Individual messages |
| `notifications` | Phase 1 | User notifications |
| `opportunity_applications` | Phase 1 | Applications to join opportunities |
| `professional_reviews` | Phase 2 | Reviews for professionals |
| `company_reviews` | Phase 2 | Reviews for companies |
| `builder_partners` | Phase 2 | Partner directory |
| `success_stories` | Phase 2 | Success stories |
| `resource_articles` | Phase 2 | Resource center articles |
| `professional_inquiries` | Phase 2b | Inquiries to professionals |
| `saved_items` | Phase 2b | Saved opportunities/professionals/companies |

### Existing Services

None — no Edge Functions for marketplace operations.

### Existing RPCs

None marketplace-specific. Uses standard Supabase client queries via `src/lib/queries.ts`.

### Existing UI

| Page | Status |
|---|---|
| LandingPage | Operational |
| AuthPage | Operational |
| HomePage | Operational |
| DiscoverPage | Operational |
| PeoplePage | Operational |
| ProfessionalsPage | Operational |
| ProfessionalDetailPage | Operational |
| CompaniesPage | Operational |
| CompanyDetailPage | Operational |
| MyOpportunitiesPage | Operational |
| CreateOpportunityPage | Operational |
| OpportunityDetailPage | Operational |
| SpacePage | Operational |
| MessagesPage | Operational |
| NotificationsPage | Operational |
| ProfilePage | Operational |
| TrustCenterPage | Operational (conceptual) |
| PricingPage | Operational |
| BuilderPartnersPage | Operational |
| SuccessStoriesPage | Operational |
| ResourceCenterPage | Operational |
| SettingsPage | Operational |

### Planned Work

| Item | Status |
|---|---|
| Opportunity SEO pages | Planned (Phase 2 spec — not yet implemented) |
| Public builder profiles | Planned (Phase 2 spec — not yet implemented) |
| Public professional profiles (SEO) | Planned (Phase 2 spec — not yet implemented) |
| Industry landing pages | Planned (Phase 2 spec — not yet implemented) |
| Location pages | Planned (Phase 2 spec — not yet implemented) |
| Advanced builder directory filters | Planned (Phase 2 spec — not yet implemented) |
| Professional directory advanced search | Planned (Phase 2 spec — not yet implemented) |
| Company directory advanced search | Planned (Phase 2 spec — not yet implemented) |
| Opportunity discovery improvements | Planned (Phase 2 spec — not yet implemented) |
| Analytics dashboard (builder) | Planned |
| Analytics dashboard (professional) | Planned |
| Marketplace health (admin) | Planned |

### Dependencies

- Depends on: Platform Layer (database, RLS, RPC, realtime, storage)
- Uses: Trust Layer (trust signals displayed alongside marketplace content) — read-only via Trust APIs
- Uses: Business Layer (entitlements gate features) — read-only
- MUST NOT: Modify trust data directly
- MUST NOT: Calculate trust signals locally

### Future Phases

- Phase 2 completion: SEO pages, public profiles, industry/location landing pages
- Phase 6.x: Analytics dashboards
- Phase 6.x: Marketplace health admin dashboard
- Phase 6.x: Advanced search and discovery

---

## LAYER 5 — PLATFORM LAYER

### Mission

Provide the engineering foundation: authentication, database, row-level security, RPC functions, storage, realtime, edge functions, and auditing. The Platform Layer is the shared infrastructure that all other layers build on.

### Responsibilities

- Authentication (Supabase Auth, email/password)
- Database schema management (migrations)
- Row-level security policy enforcement
- RPC function management (SECURITY DEFINER functions)
- File storage (Supabase Storage — not yet configured)
- Realtime subscriptions (messages, notifications, tasks, activity_log, checklist_items)
- Edge Function deployment
- Audit logging (immutable admin audit log)

### Existing Implementation

| Component | Status | Notes |
|---|---|---|
| Authentication | Operational | Supabase Auth, email/password, auto-profile creation trigger |
| Database | Operational | 27+ tables across 8 migrations |
| RLS | Operational | Enabled on all tables, ownership/membership scoped |
| Realtime | Operational | 5 tables: messages, notifications, tasks, activity_log, checklist_items |
| Auditing | Operational | admin_audit_log (immutable), admin_notes |
| Edge Functions | Not deployed | None deployed yet |
| Storage | Not configured | Supabase Storage not yet used |
| RPC functions | Partial | is_admin(), _admin_audit(), is_company_member(), subscription admin RPCs |

### Existing Database Objects — All Tables

| Table | Schema Phase | Layer |
|---|---|---|
| `profiles` | Phase 1 | Marketplace |
| `opportunities` | Phase 1 | Marketplace |
| `opportunity_roles` | Phase 1 | Marketplace |
| `collaboration_spaces` | Phase 1 | Marketplace |
| `space_members` | Phase 1 | Marketplace |
| `tasks` | Phase 1 | Marketplace |
| `checklist_items` | Phase 1 | Marketplace |
| `milestones` | Phase 1 | Marketplace |
| `space_files` | Phase 1 | Marketplace |
| `decisions` | Phase 1 | Marketplace |
| `activity_log` | Phase 1 | Marketplace |
| `conversations` | Phase 1 | Marketplace |
| `conversation_participants` | Phase 1 | Marketplace |
| `messages` | Phase 1 | Marketplace |
| `notifications` | Phase 1 | Marketplace |
| `opportunity_applications` | Phase 1 | Marketplace |
| `verification_claims` | Phase 1 | Trust |
| `verification_timeline` | Phase 1 | Trust |
| `collaboration_reviews` | Phase 1 | Trust |
| `fraud_alerts` | Phase 1 | Trust |
| `professionals` | Phase 2 | Marketplace/Business |
| `professional_reviews` | Phase 2 | Marketplace/Trust |
| `companies` | Phase 2 | Marketplace/Business |
| `company_reviews` | Phase 2 | Marketplace/Trust |
| `builder_partners` | Phase 2 | Marketplace |
| `success_stories` | Phase 2 | Marketplace |
| `resource_articles` | Phase 2 | Marketplace |
| `professional_inquiries` | Phase 2b | Marketplace |
| `saved_items` | Phase 2b | Marketplace |
| `admin_audit_log` | Phase 3.1 | Platform (Trust/Business shared) |
| `admin_notes` | Phase 3.1 | Platform (Trust/Business shared) |
| `admin_users` | Phase 3.1 | Platform |
| `subscription_plans` | Phase 3.2 | Business |
| `plan_entitlements` | Phase 3.2 | Business |
| `user_subscriptions` | Phase 3.2 | Business |
| `company_seats` | Phase 3.2 | Business |
| `seat_assignments` | Phase 3.2 | Business |
| `subscription_cost_factors` | Phase 3.2 | Business |

### Existing Triggers

| Trigger | Purpose | Layer |
|---|---|---|
| `on_auth_user_created` | Auto-create profile on signup | Platform |
| `profiles_updated_at` | Auto-update updated_at on profiles | Platform |
| `trg_check_seat_capacity` | Enforce company seat capacity | Business |

### Existing Realtime Subscriptions

| Table | Purpose |
|---|---|
| `messages` | Live messaging |
| `notifications` | Live notifications |
| `tasks` | Live task updates |
| `activity_log` | Live activity feed |
| `checklist_items` | Live checklist updates |

### Existing Migrations

| Migration | Date | Content |
|---|---|---|
| `create_core_schema` | 2026-07-23 | 20 tables, RLS, indexes (Phase 1) |
| `create_profile_trigger` | 2026-07-23 | Auto-profile on signup |
| `enable_realtime` | 2026-07-23 | Realtime on 5 tables |
| `add_updated_at_trigger` | 2026-07-23 | Profile updated_at trigger |
| `phase2_schema` | 2026-07-23 | 7 tables (Phase 2) |
| `phase2b_inquiries_saved` | 2026-07-24 | Inquiries + saved items |
| `phase31_admin_foundation` | 2026-07-26 | Admin tables, audit log, RPCs |
| `phase32_subscription_foundation` | 2026-07-26 | Subscription tables, RLS, RPCs |
| `phase32a_subscription_security_correction` | 2026-07-26 | RLS correction |

### Planned Work

| Item | Status |
|---|---|
| Edge Functions for trust calculations | Planned (Phase 4.x) |
| Edge Functions for scheduled jobs | Planned (Phase 4.x) |
| Storage buckets for file uploads | Planned |
| Additional RPC functions for trust engine | Planned (Phase 4.x) |
| Realtime for trust events | Future |

### Dependencies

- Depends on: Infrastructure Layer (Supabase, Cloudflare)
- Serves: All layers above

### Future Phases

- Edge Function deployment for trust engine scheduled jobs
- Storage configuration for file uploads
- Additional realtime channels
- Performance optimization and indexing

---

## LAYER 6 — INFRASTRUCTURE LAYER

### Mission

Provide the hosting, version control, database hosting, CDN, and payment processing infrastructure that the platform runs on.

### Responsibilities

- Application hosting and build pipeline (Cloudflare Pages connected to GitHub)
- Source code repository (GitHub)
- Database, auth, realtime, storage, edge functions (Supabase)
- CDN and DNS (Cloudflare)
- Transactional email delivery (Resend)
- Payment processing (Stripe — future)

### Existing Infrastructure

| Service | Status | Usage |
|---|---|---|
| GitHub | Operational | Source code repository |
| Supabase | Operational | Database (Postgres), Auth, Realtime, Storage, Edge Functions |
| Cloudflare | In progress | DNS is owner-controlled; Pages production cutover pending |
| Resend | Operational | Verified `oppnets.com` transactional-email domain |
| Stripe | Not configured | Payment processing — future |

### Existing Configuration

| Component | Status |
|---|---|
| Supabase project | Provisioned |
| Environment variables | Public frontend variables documented; server secrets remain in owner-controlled services |
| Database migrations | 15 migrations in GitHub; live migration audit pending |
| RLS policies | Enabled on all tables |
| Realtime | Enabled on 5 tables |
| Edge Functions | Legacy email source recovered but quarantined pending secure replacement |

### Planned Work

| Item | Status |
|---|---|
| Cloudflare Pages production deployment | In progress |
| Stripe account setup | Future (Phase 5.x) |
| Edge Function deployment | Planned (Phase 4.x) |
| Storage bucket configuration | Planned |
| Production deployment pipeline | Future |

### Dependencies

- Depends on: Nothing (lowest layer)
- Serves: Platform Layer

---

## DEPENDENCY GRAPH

### Permitted Dependencies

```
Founder Governance ──governs──> All Layers

Trust Layer ──reads (read-only)──> Marketplace Layer
    (collaboration_spaces, space_members, tasks, activity_log,
     opportunity_applications, profiles)

Trust Layer ──serves──> Marketplace Layer
    (trust signals displayed in marketplace UI via Trust APIs)

Business Layer ──serves──> Marketplace Layer
    (entitlements gate marketplace features)

Business Layer ──reads──> Platform Layer
    (database, RLS, RPC)

Marketplace Layer ──reads──> Trust Layer
    (trust signals via Trust APIs — read-only)

Marketplace Layer ──reads──> Business Layer
    (entitlement checks — read-only)

All Layers ──run on──> Platform Layer

Platform Layer ──hosted on──> Infrastructure Layer
```

### Prohibited Dependencies

```
Business Layer ──MUST NOT──> Trust Layer
    Business Layer may never modify, influence, or calculate trust data.
    Subscriptions, payments, and entitlements do not affect trust.

Trust Layer ──MUST NOT──> Business Layer (for calculations)
    Trust Layer may never read subscription, entitlement, or payment
    tables for trust calculations. Constitutional prohibition.
    (Trust Layer may read Business Layer for audit purposes only —
    to verify payment independence, never to factor payment into trust.)

Marketplace Layer ──MUST NOT──> Trust Layer (direct write)
    Marketplace Layer may never create, modify, or delete trust records.
    All trust mutations go through Trust Layer RPCs.

Marketplace Layer ──MUST NOT──> Trust Layer (local calculation)
    Marketplace Layer may never calculate trust signals locally.
    All trust signals come from Trust Layer APIs.

Infrastructure Layer ──MUST NOT──> Any Layer above
    Infrastructure is the lowest layer. It may not influence
    trust, business, or marketplace logic.

Any Layer ──MUST NOT──> Founder Governance Layer (override)
    No layer may override constitutional principles.
    Founder Governance is the highest authority.
```

### Dependency Matrix

| From ↓ / To → | Governance | Trust | Business | Marketplace | Platform | Infrastructure |
|---|---|---|---|---|---|---|
| Governance | — | governs | governs | governs | governs | governs |
| Trust | complies | — | PROHIBITED (calc) | reads (RO) | runs on | hosted on |
| Business | complies | PROHIBITED | — | serves | runs on | hosted on |
| Marketplace | complies | reads (RO via API) | reads (RO) | — | runs on | hosted on |
| Platform | complies | — | — | — | — | hosted on |
| Infrastructure | — | — | — | — | — | — |

---

## CANON INDEX

Every major approved artifact in the OppNets platform is assigned a permanent document identifier. Once assigned, IDs are never reused or renumbered.

| Document ID | Document Name | Version | Status | Authority Level | Date |
|---|---|---|---|---|---|
| GOV-001 | OppNets Trust Constitution | 1.0 | Approved | Constitutional | 2026-07-26 |
| GOV-002 | Trust Engine Implementation Plan | 1.0 | Approved | Implementation Guide | 2026-07-26 |
| GOV-003 | Platform Architecture Map | 1.0 | Approved (this document) | Architecture Reference | 2026-07-26 |
| GOV-004 | Phase 3.1 Admin Foundation | — | Implemented | Implementation Record | 2026-07-26 |
| GOV-005 | Phase 3.2 Subscription Foundation | — | Implemented | Implementation Record | 2026-07-26 |
| GOV-006 | Phase 3.2A Subscription Security Correction | — | Implemented | Implementation Record | 2026-07-26 |
| GOV-007 | Phase 2 Feature Expansion Specification | — | Approved | Specification | 2026-07-23 |
| GOV-008 | Phase 1 Core Build Specification | — | Completed | Specification | 2026-07-23 |

### Documents Referenced But Not Yet Formalized

| Working Name | Status | Notes |
|---|---|---|
| Founder Pricing Approval | Referenced in subscription architecture | Needs formalization as standalone document |
| Pricing Blueprint | Referenced in subscription architecture | Needs formalization as standalone document |
| Admin Governance | Referenced in admin foundation | Needs formalization as standalone document |
| Subscription Architecture | Referenced in Phase 3.2 | Needs formalization as standalone document |

---

## LAYER MATURITY ASSESSMENT

### Maturity Scale

| Level | Definition |
|---|---|
| Complete | Fully implemented, tested, production-ready |
| Operational | Implemented and functional, may need enhancement |
| In Progress | Partially implemented, active development |
| Planned | Approved and specified, not yet implemented |
| Future | Conceptual, not yet specified |

### Assessment by Layer

| Layer | Maturity | Justification |
|---|---|---|
| Founder Governance | Operational | Constitution and implementation plan approved. Architecture map produced. Several governance documents referenced but not yet formalized as standalone canon entries. |
| Trust Layer | In Progress | Basic trust tables exist (verification, reviews, fraud alerts) but lack lifecycle, eligibility, double-blind, reputation calculation, badge engine, recommendation engine, and fraud detection. Trust Center page is conceptual. 9 implementation phases planned (4.1–4.9). |
| Business Layer | Operational | Subscription plans, entitlements, user subscriptions, company seats, and seat assignments all implemented. Pricing page operational. Admin subscription management operational. No payment processing yet. |
| Marketplace Layer | Operational | 22 pages operational covering opportunities, people, professionals, companies, collaboration, messaging, notifications, success stories, resources, and builder partners. SEO pages, public profiles, industry/location landing pages, and analytics dashboards not yet implemented. |
| Platform Layer | Operational | Auth, database (27+ tables), RLS, realtime (5 tables), and auditing all operational. Edge Functions not deployed. Storage not configured. RPC library partial. |
| Infrastructure Layer | In Progress | GitHub, Supabase, Cloudflare, and Resend are independently owner-controlled. Cloudflare Pages cutover and final credential rotation remain; Stripe is not configured. |

### Summary

| Status | Count | Layers |
|---|---|---|
| Complete | 0 | — |
| Operational | 4 | Founder Governance, Business, Marketplace, Platform |
| In Progress | 1 | Trust |
| Planned | 0 | — |
| Future | 1 | Infrastructure (partial) |

---

## RECOMMENDATION — NEXT IMPLEMENTATION PHASE

### Current State

The platform has a solid marketplace, operational business layer, and functional platform infrastructure. The Trust Layer — the platform's core differentiator — is the least mature layer. It has basic tables and a conceptual Trust Center page, but none of the calculated trust signals, lifecycle management, or fraud detection that the Trust Constitution requires.

### Recommendation

**Proceed to Phase 4.1 — Trust Foundation.**

Phase 4.1 creates the foundational trust schema (trust audit records, trust event log, trust configuration) that all subsequent trust phases depend on. It is the lowest-risk, highest-leverage next step:

- It establishes the immutable audit pattern that every future trust phase uses
- It creates the configuration table that defines trust thresholds
- It does not modify any existing tables or data
- It is independently rollback-able
- It unblocks Phases 4.2 through 4.9

No other layer has a blocked dependency on Phase 4.1. Marketplace SEO pages, analytics dashboards, and Stripe integration can proceed in parallel if desired, but the Trust Layer is the platform's core differentiator and should be the priority.

### Prerequisites

| Prerequisite | Status |
|---|---|
| Trust Constitution (GOV-001) | Approved |
| Trust Implementation Plan (GOV-002) | Approved |
| Platform Architecture Map (GOV-003) | Approved (this document) |
| Founder approval to proceed | Awaiting |

---

**END OF DOCUMENT — OPPNETS PLATFORM ARCHITECTURE MAP VERSION 1.0**

**No implementation. No code. No migrations. No database changes.**
**This document is an architecture reference and will be updated as implementation progresses.**
