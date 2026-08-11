# OppNets

OppNets is **The Opportunity Network**: a trust-first platform for discovering opportunities, finding trusted collaborators, building teams, and executing together.

> Every connection should lead to an opportunity.

## Ownership and source of truth

- Source code: GitHub repository `Jungletech13/oppnets`
- Database, authentication, realtime, and server functions: Omar's Supabase project
- Domain and DNS: `oppnets.com` in Omar's Cloudflare account
- Production target: Cloudflare Pages connected directly to this GitHub repository
- Email delivery: Omar's Resend account and the verified `oppnets.com` domain

OppNets has no required Bolt runtime, hosting, asset, database, or deployment dependency.

## Local development

Requirements: Node.js 22–24 and npm.

```bash
cp .env.example .env
npm ci
npm run dev
```

Set the two public Supabase values in `.env`. Never commit real secrets.

## Quality checks

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs type-checking, linting, unit tests, and a production build. The Playwright suite runs repeatable desktop and Pixel 7 user simulations, with HTML/JSON reports and failure screenshots, video, and traces. See [Automated Browser QA](docs/operations/AUTOMATED-BROWSER-QA.md) for coverage and the boundary between simulated UI authentication and live Supabase testing.

## Database changes

All database migrations belong in `supabase/migrations`. Server-side functions belong in `supabase/functions`. Apply migrations and deploy functions through the directly owned Supabase project; do not make undocumented production-only changes.

## Governance

The approved [OppNets Trust Constitution](docs/governance/OPPNETS-TRUST-CONSTITUTION-v1.0.md) is binding. In particular:

- trust is earned, never bought;
- OppNets does not use a single numeric trust score;
- AI recommends and people decide;
- payment data may not influence trust;
- the marketplace may read trust signals but may not mutate trust data directly.

## Operations

See [Independent Operations](docs/operations/INDEPENDENT-OPERATIONS.md) for deployment, environment, rollback, backup, and final separation procedures. The handoff archive has been received and assessed in the [Bolt Handoff Verification](docs/operations/BOLT-HANDOFF-VERIFICATION-2026-08-06.md); the original request is retained only as a historical record.
