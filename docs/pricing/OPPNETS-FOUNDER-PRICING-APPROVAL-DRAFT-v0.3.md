# OPPNETS FOUNDER PRICING APPROVAL
## Version 0.3 — DRAFT

**Status: DRAFT — PENDING FOUNDER APPROVAL**
**Document ID: (pending assignment upon approval)**
**Date: July 26, 2026**
**Authority Level: Founder Approval Document — requires Founder signature to activate**

---

## PURPOSE

This document captures the current pricing architecture, plan definitions, entitlements, company seat rules, and trust protections as implemented in Phase 3.2 and corrected in Phase 3.2A. All pricing is DRAFT and configurable. No pricing is final until the Founder approves this document.

---

## PRICING ARCHITECTURE PRINCIPLES

1. **Architecture only — no payment processing.** Phase 3.2 created the subscription database schema. No Stripe integration, no billing, no payment processing exists.
2. **All pricing is DRAFT.** Every plan has `approval_status = 'draft'`. No plan is visible to the public until the Founder sets `approval_status = 'founder_approved'`.
3. **Trust protections are constitutional.** No pricing decision may affect trust signals. This is enforced by the Trust Constitution (GOV-001) and the layer separation architecture.
4. **Configurable, not hardcoded.** All plan prices, entitlements, and cost factors are stored in the database and admin-managed.

---

## PLAN DEFINITIONS (DRAFT)

| Plan | Slug | Price (monthly) | Category | Status |
|---|---|---|---|---|
| Builder Free | `builder-free` | $0.00 | `builder_free` | Draft |
| Builder Pro | `builder-pro` | $19.00 | `builder_pro` | Draft |
| Professional | `professional` | $49.00 | `professional` | Draft |
| Company | `company` | $99.00 | `company` | Draft |

All prices are in USD cents (`price_cents`: 0, 1900, 4900, 9900). Billing interval: monthly.

---

## PLAN ENTITLEMENTS (DRAFT)

| Entitlement | Builder Free | Builder Pro | Professional | Company |
|---|---|---|---|---|
| Max Opportunities | 5 | 25 | 10 | 50 |
| Max Applications | 10 | 50 | 25 | 100 |
| Max Saved Items | 25 | 100 | 50 | 200 |
| Max Collaboration Spaces | 3 | 10 | 5 | 25 |
| Max Team Members | 5 | 15 | 10 | 50 |
| Max Messages/Day | 50 | 200 | 100 | 500 |
| Storage Limit (MB) | 100 | 1,000 | 500 | 5,000 |
| Max Professional Listings | 0 | 0 | 1 | 0 |
| Max Company Pages | 0 | 0 | 0 | 1 |
| AI Access | No | Yes | No | No |
| Advanced Search | No | Yes | Yes | Yes |
| Analytics Access | No | Yes | Yes | Yes |
| Priority Visibility | No | Yes | Yes | Yes |
| Sponsored Listing Access | No | No | Yes | Yes |
| Recruiting Tools | No | No | No | Yes |
| Marketing Tools | No | No | No | Yes |
| Public Builder Profile | No | Yes | Yes | Yes |
| SEO Profile | No | Yes | Yes | Yes |

---

## COMPANY SEAT RULES

### Seat Model
- Company plan includes a configurable number of seats (`included_seats`)
- Additional seats may be purchased (`additional_seats`)
- `total_seats` is a GENERATED column: `included_seats + additional_seats`
- CHECK constraints: `included_seats >= 0`, `additional_seats >= 0`

### Seat Assignment Roles
Seats are assigned with the following roles:
- `owner` — Company account owner
- `administrator` — Full company management
- `recruiter` — Can post opportunities and manage applicants
- `manager` — Can manage team members and collaboration spaces
- `team_member` — Standard team access
- `billing_manager` — Can manage subscription and billing

### Seat Assignment Constraints
1. **One active seat per user per company.** Enforced by partial unique index: `(company_id, user_id) WHERE active = true`.
2. **Seat capacity enforced.** A trigger (`trg_check_seat_capacity`) prevents assigning more active seats than `total_seats`.
3. **Active subscription required.** Seat assignment requires an active or trial company-category subscription.
4. **Founder-approved plan required.** Seat assignment requires `approval_status = 'founder_approved'` on the plan.
5. **Admin-only assignment.** Seat assignments are admin-managed via RPC (`admin_assign_seat`, `admin_remove_seat`). Users cannot self-assign.

### Seat Assignment Validation (Trigger Logic)
1. Check that a `company_seats` record exists for the company
2. Check that an active/trial subscription exists for the company
3. Check that the subscription plan category is `company`
4. Check that the plan is `founder_approved`
5. Check that the plan is `active`
6. Count active seat assignments and reject if `>= total_seats`

---

## TRUST PROTECTIONS

The following protections are constitutional (GOV-001) and enforced by the architecture:

1. **No paid trust.** Plan tier does not affect verification, badges, reputation, or recommendations.
2. **Trust Layer cannot read payment data.** Constitutional prohibition enforced by layer separation.
3. **Business Layer cannot modify trust data.** Constitutional prohibition enforced by RLS and RPC boundaries.
4. **Fraud detection is payment-independent.** Fraud alerts are not influenced by subscription status.
5. **Equal trust opportunity.** Every user can earn trust through verified collaboration regardless of plan.

---

## SUBSCRIPTION SECURITY (Phase 3.2A Corrections)

The following security corrections were applied after the Phase 3.2 audit:

1. **Users cannot self-assign plans.** `user_subscriptions` INSERT/UPDATE are admin-only via `is_admin()`.
2. **One current subscription per user.** Partial unique index on `user_id WHERE status IN ('free', 'trial', 'active', 'past_due')`.
3. **Draft approval gate.** Plans have `approval_status` column. Public SELECT requires `founder_approved`. No draft plan is visible to users.
4. **Atomic admin mutations.** 8 RPC functions replace separate client mutation + audit log calls. Each RPC verifies admin, validates, mutates, audits, and returns within a single transaction.
5. **Seat count integrity.** `total_seats` is generated, not user-set. CHECK constraints prevent negative values. Trigger prevents over-assignment.
6. **Non-recursive seat RLS.** `is_company_member()` helper function replaces self-referential RLS policies.

---

## COST FACTORS (DRAFT — NOT FOUNDER APPROVED)

| Category | Monthly Cost (cents) | Description |
|---|---|---|
| Infrastructure | $20.00 | DRAFT — Supabase, hosting, CDN baseline cost |
| AI | $5.00 | DRAFT — AI API calls estimate (Builder Pro users) |
| Storage | $2.00 | DRAFT — File storage for collaboration spaces |
| Email | $1.00 | DRAFT — Transactional email cost |
| Support | $3.00 | DRAFT — Support tooling and overhead |

These are internal cost estimates for unit economics analysis. They are not user-facing and are admin-only.

---

## ADMIN RPC FUNCTIONS

The following RPC functions manage subscriptions atomically (Phase 3.2A):

| Function | Purpose |
|---|---|
| `admin_create_plan` | Create a new subscription plan (admin-only, audited) |
| `admin_update_plan` | Update a plan (admin-only, audited) |
| `admin_update_entitlements` | Update plan entitlements (admin-only, audited) |
| `admin_assign_subscription` | Assign a subscription to a user (admin-only, validates founder_approved + active) |
| `admin_update_subscription_status` | Update subscription status (admin-only, audited) |
| `admin_assign_seat` | Assign a company seat (admin-only, audited) |
| `admin_remove_seat` | Remove a company seat (admin-only, audited) |
| `admin_update_cost_factor` | Update cost factors (admin-only, audited) |

All RPCs:
- Verify `is_admin()`
- Use fixed `search_path = public, pg_temp`
- Write to `admin_audit_log` within the same transaction
- Are `SECURITY DEFINER` functions

---

## PENDING DECISIONS REGISTER

| # | Decision | Status | Notes |
|---|---|---|---|
| 1 | Final pricing for each plan | Pending Founder approval | Current prices are draft placeholders |
| 2 | Seat allocation for Company plan | Pending Founder approval | `included_seats` not yet seeded with a default |
| 3 | Annual billing discount | Pending Founder decision | Only monthly interval implemented |
| 4 | Trial period length | Pending Founder decision | `trial_start`/`trial_end` fields exist but no default trial |
| 5 | Stripe integration timeline | Pending Founder decision | Architecture only, no payment processing |
| 6 | Sponsored listing pricing | Pending Founder decision | `sponsored_listing_access` flag exists, no pricing model |
| 7 | Professional premium placement pricing | Pending Founder decision | `premium` flag on professionals exists, no pricing model |
| 8 | Unlock system (paid one-time actions) | Pending Founder decision | Not yet implemented |
| 9 | Proration policy for upgrades/downgrades | Pending Founder decision | Not yet implemented |
| 10 | Cost factor finalization | Pending Founder review | Current cost factors are draft estimates |

---

## APPROVAL PROCESS

1. Founder reviews this document
2. Founder approves or requests changes
3. Upon approval:
   - Document version becomes 1.0
   - Document ID is assigned (GOV-00x)
   - Status changes from DRAFT to APPROVED
   - Plans may be set to `founder_approved` in the database
   - Pricing becomes visible to users
4. Until approval:
   - All plans remain `draft`
   - No pricing is visible to users
   - No payment processing is enabled

---

**END OF DOCUMENT — OPPNETS FOUNDER PRICING APPROVAL VERSION 0.3 DRAFT**
**This document is DRAFT. No pricing is final until the Founder approves.**
**Trust protections described herein are constitutional (GOV-001) and are in force regardless of this document's approval status.**
