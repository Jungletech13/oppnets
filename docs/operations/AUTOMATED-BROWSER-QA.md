# OppNets Automated Browser QA

## Purpose

OppNets uses Playwright bots to simulate signed-out visitors, new users, returning users, desktop members, and mobile members. The suite is a release guard: a failed test blocks confidence in the branch and preserves screenshots, traces, video, and structured results for diagnosis.

## Current coverage

- Signed-out page load, OppNets title, canonical URL, description, favicon, and owned social-preview image
- Invalid-login feedback
- Development-only new-user signup and returning-user login/logout simulations
- Every primary desktop navigation destination
- Discover search and empty-result recovery
- Notifications and mark-all-read
- Messages on desktop and mobile, including list/thread/back behavior
- Settings edit, save state, and notification switches
- People and Teams search, verification toggle, and every group-type selection
- Pixel 7 mobile menu, touch-target baseline, visible images, and horizontal-overflow checks
- Create Opportunity and Notifications page viewport checks
- JavaScript page errors, console errors, failed same-origin requests, and broken same-origin assets

## Authentication safety boundary

The local runner uses `.env.e2e` and a simulated account only when both conditions are true:

1. Vite is running in development mode.
2. `VITE_E2E_MODE=true`.

The bypass is disabled in every production build because `import.meta.env.DEV` is false. The test account and credentials are fictional. The suite does not store or use production credentials.

This simulation proves UI behavior; it does not prove Supabase authentication, email confirmation, token refresh, or RLS. Those require a separate Cloudflare preview connected to the owned Supabase test environment.

## Run locally

Install dependencies and the Playwright browser once:

```bash
npm ci
npx playwright install chromium
```

Run all user simulations:

```bash
npm run test:e2e
```

Run the full non-browser and browser gate:

```bash
npm run check:all
```

Open the last HTML report:

```bash
npm run test:e2e:report
```

Generated reports are intentionally ignored by Git. GitHub Actions retains them as the `oppnets-playwright-report` artifact for 14 days.

## CI behavior

The `Quality` workflow runs on pull requests and pushes to `main`. Its browser job:

1. installs Node.js 22 and locked npm dependencies;
2. installs isolated Playwright Chromium and FFmpeg;
3. runs desktop and mobile bots;
4. uploads the HTML report, JSON result, screenshots, videos, and traces even when a test fails.

## Live-preview tests still required

Before production cutover, run the independent Cloudflare preview with two real test accounts and verify:

- real signup, confirmation, login, token refresh, expiration, and logout;
- cross-account Supabase persistence and realtime messaging;
- member/non-member and admin/non-admin RLS isolation;
- Resend delivery and recipient authorization;
- uploads and private-file access;
- mobile portrait/landscape on the owner's actual phone;
- browser Back, refresh, deep links, and public opportunity URLs after URL routing is implemented.
