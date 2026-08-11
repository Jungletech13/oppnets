# OppNets Independent Operations

## Purpose

This runbook makes the GitHub repository, Supabase project, Cloudflare account, domain, and Resend account the complete OppNets operating system. Bolt is not part of the production path.

## Production topology

1. GitHub `main` is the source of truth.
2. Cloudflare Pages builds the repository with `npm ci && npm run check` and publishes `dist`.
3. `oppnets.com` points to the Cloudflare Pages project.
4. The browser uses only the public Supabase URL and anonymous key.
5. Supabase stores private server secrets for Edge Functions.
6. Resend sends mail for the verified `oppnets.com` domain.

## Environment variables

Cloudflare Pages:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Supabase Edge Function secrets:

- `RESEND_API_KEY`
- `EMAIL_FROM_AUTH=noreply@oppnets.com`
- `EMAIL_FROM_NOTIFICATIONS=notifications@oppnets.com`
- `APP_URL=https://oppnets.com`

Never place service-role keys or provider secrets in client variables, `.env.example`, committed files, or build logs.

## Deployment

Create one Cloudflare Pages project connected to `Jungletech13/oppnets`.

- Production branch: `main`
- Build command: `npm ci && npm run check`
- Output directory: `dist`
- Node version: 22

Cloudflare Pages should deploy GitHub commits directly. A deployment is accepted only after typecheck, lint, and build pass for the exact commit.

## Rollback

1. Identify the last known-good Git commit.
2. Use Cloudflare Pages deployment history to roll traffic back immediately.
3. Fix forward in a new branch and pull request.
4. Never rewrite or delete migration history to roll back a database change. Use an explicit corrective migration.

## Database and function discipline

- Commit every migration before applying it.
- Commit every Edge Function before deploying it.
- Enable RLS on every application table.
- Keep trust mutations behind approved server-side RPC or Edge Function boundaries.
- Confirm production migration status against the repository before each release.
- Export schema and verify Supabase backups before material production migrations.

## Bolt exit checklist

Complete these items only after the independent production deployment works end to end:

- [x] Receive and verify the final Bolt handoff archive.
- [x] Recover and quarantine the deployed Bolt-era `send-email` source.
- [x] Remove `.bolt` configuration from GitHub.
- [x] Remove Bolt-hosted metadata and images.
- [x] Rename the generic starter package to `oppnets`.
- [x] Add independent environment and deployment instructions.
- [ ] Deploy the GitHub repository through Cloudflare Pages.
- [ ] Verify `oppnets.com` and `www.oppnets.com` on the independent deployment.
- [ ] Verify signup, login, password reset, database reads/writes, and realtime.
- [ ] Commit and deploy every required Supabase Edge Function.
- [ ] Configure and verify Resend secrets and welcome-email delivery.
- [ ] Confirm Supabase ownership is no longer managed through Bolt.
- [ ] Remove Bolt's GitHub repository access.
- [ ] Unpublish or delete the old Bolt-hosted deployment after DNS cutover.
- [ ] Archive or delete the Bolt project only after the final data and configuration check.

The ownership transfer or claim of a Bolt-managed Supabase project may be one-way. Verify direct Supabase access, backups, environment values, and function code before confirming that transfer in any dashboard.

The final archive verification and security findings are recorded in [Bolt Handoff Verification — 2026-08-06](BOLT-HANDOFF-VERIFICATION-2026-08-06.md).
