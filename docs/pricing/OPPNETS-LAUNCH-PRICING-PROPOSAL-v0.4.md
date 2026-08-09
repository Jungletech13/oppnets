# OppNets Launch Pricing Proposal

**Version:** 0.4
**Status:** Proposed for founder approval
**Date:** August 8, 2026
**Currency:** USD
**Scope:** Initial self-serve launch catalog for Stripe Sandbox

## Commercial principles

1. Payment buys capacity, workflow tools, and legitimate promotion. It never buys verification, trust, reputation, favorable reviews, or recommendation rank.
2. The free plan must be useful enough to create and join a real opportunity.
3. Limits should follow the customer's operating scale, not arbitrarily block core safety or communication features.
4. Sponsored placement must always be labeled and must not override eligibility, safety, or relevance filters.
5. Stripe remains in Sandbox until the catalog, checkout, webhook handling, refunds, and customer portal pass end-to-end testing.

## Membership plans

| Plan | Monthly | Annual | Intended customer |
|---|---:|---:|---|
| Builder Free | $0 | $0 | A person exploring, joining, or validating an idea |
| Builder Pro | $19 | $190 | An active builder managing multiple opportunities |
| Professional | $49 | $490 | A consultant, specialist, or service business finding clients and collaborators |
| Company | $99 | $990 | A small organization recruiting and coordinating a team |

Annual prices provide two months free. Taxes, where required, are calculated in addition to the listed price.

### Builder Free

- Public profile
- Browse and save opportunities
- Up to 2 active owned opportunities
- Up to 10 active applications
- Up to 2 collaboration spaces
- Up to 5 members per space
- Core tasks, milestones, messages, and evidence
- 250 MB storage
- Standard search and support

### Builder Pro

Everything in Builder Free, plus:

- Up to 10 active owned opportunities
- Up to 50 active applications
- Up to 10 collaboration spaces
- Up to 15 members per space
- 5 GB storage
- Advanced search and saved searches
- Workspace templates and analytics
- AI-assisted drafting, subject to fair-use limits
- Data export

### Professional

Everything in Builder Pro, plus:

- One professional services listing
- Up to 15 active owned opportunities
- Lead and inquiry management
- Service packages and intake forms
- Professional analytics
- Appointment and external-link calls to action
- 10 GB storage
- Sponsored-placement eligibility; placement is purchased separately and labeled

### Company

Everything in Professional, plus:

- One company page
- 5 included seats
- Up to 50 active owned opportunities
- Up to 25 collaboration spaces
- Up to 50 members per space
- Recruiting pipeline and applicant management
- Company analytics, roles, and permissions
- 25 GB pooled storage
- $12 per additional seat per month or $120 annually

## One-time and recurring add-ons

| Add-on | Price | Billing | Rules |
|---|---:|---|---|
| Opportunity Spotlight | $29 | 7 days | Clearly labeled sponsored placement; relevance and safety eligibility still apply |
| Opportunity Spotlight Plus | $69 | 30 days | Same protections; includes placement analytics |
| Professional Listing Boost | $39 | 30 days | Available only to an active Professional or Company account; clearly labeled |
| Extra Storage 25 GB | $10 | Monthly | Account-level capacity add-on |
| Company Seat | $12 | Monthly per seat | Company plan only; prorated on addition |

Do not launch paid identity verification, paid trust badges, paid review removal, guaranteed matching, or guaranteed opportunity outcomes.

## Launch billing rules

- **Trial:** No automatic free trial at launch. The permanent free plan is the evaluation path and reduces trial abuse.
- **Upgrades:** Effective immediately with Stripe-calculated proration.
- **Downgrades:** Effective at the end of the current billing period. Users must resolve usage above the new plan's limits before creating new items.
- **Cancellation:** Access continues through the paid period; no additional renewal is charged.
- **Refunds:** Duplicate charges and confirmed technical billing errors are refunded. Other subscription refunds are reviewed case by case. Unused promotional add-ons may be refunded only if promotion has not begun.
- **Failed payments:** Use Stripe's retry process. Provide a grace period before restricting paid-only creation features; never delete customer content automatically.
- **Taxes:** Use Stripe Managed Payments/Tax where available. Stripe's collection does not replace income-tax reporting or professional tax advice.
- **Receipts and invoices:** Stripe provides receipts; invoices are enabled for business customers.

## Stripe Sandbox catalog

Create these products only after founder approval:

1. `OppNets Builder Pro` â€” recurring prices `$19/month` and `$190/year`
2. `OppNets Professional` â€” recurring prices `$49/month` and `$490/year`
3. `OppNets Company` â€” recurring prices `$99/month` and `$990/year`
4. `OppNets Company Seat` â€” recurring prices `$12/month` and `$120/year`
5. `OppNets Opportunity Spotlight â€” 7 Days` â€” one-time `$29`
6. `OppNets Opportunity Spotlight Plus â€” 30 Days` â€” one-time `$69`
7. `OppNets Professional Listing Boost â€” 30 Days` â€” one-time `$39`
8. `OppNets Extra Storage â€” 25 GB` â€” recurring `$10/month`

Builder Free is managed inside OppNets and does not need a Stripe product.

## Required metadata

Attach stable metadata to every Stripe product and price:

- `app=oppnets`
- `environment=sandbox`
- `catalog_version=0.4`
- `product_type=subscription|seat|promotion|storage`
- `plan_slug` or `addon_slug`

Never authorize access from a displayed price or product name. OppNets must map approved Stripe Price IDs to internal entitlements and verify changes through signed webhooks.

## Activation gates

The catalog may move from Sandbox to live only after:

- Founder approves the prices and entitlements in this document
- Products and prices are created in Stripe Sandbox
- Checkout, successful payment, cancellation, upgrade, downgrade, failed payment, refund, and customer-portal flows pass
- Signed webhook events update OppNets idempotently
- No secret key is present in frontend code or Git history
- Trust and recommendation tests prove paid status cannot alter trust outcomes
- Terms, refund language, privacy disclosures, and support contact are published
- Stripe live-account verification is complete

## Founder decision

- [ ] Approve as written
- [ ] Approve with changes
- [ ] Reject and return for revision

Until one option is explicitly selected, this remains a proposal and no live billing is authorized.

