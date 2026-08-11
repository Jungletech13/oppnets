# OppNets Release Readiness QA — public summary

## Current verdict

The independent OppNets build is suitable for an isolated Cloudflare preview and continued mobile acceptance testing. It is not yet approved for production cutover, and `oppnets.com` must remain unchanged until the owner approves the verified preview.

## Verified locally

- TypeScript type-check: pass
- ESLint: pass with warnings only
- People and Teams regression tests: 5 passing
- Vite production build: pass
- Production dependency audit: 0 known vulnerabilities
- Playwright user-simulation suite: 11 passing across desktop Chromium and a Pixel 7 viewport
- People and Teams type selection changes its type-specific choices and visible results
- Mobile navigation, Messages list/thread behavior, touch targets, images/assets, and horizontal overflow are covered
- OppNets title, description, canonical URL, Open Graph metadata, and favicon are present
- Bolt configuration and runtime dependency are removed
- Facebook integration remains proposal-only and is not part of this release branch

## Acceptance gates

Before production cutover:

1. Deploy this branch to an isolated Cloudflare preview without changing the production domain.
2. Test the preview on the owner's phone in portrait and landscape.
3. Exercise principal workflows with two real test accounts against the owner-controlled services.
4. Verify authentication, data access, collaboration, messaging, notifications, administration, email, uploads, and sandbox billing in the intended environment.
5. Confirm preview metadata, refresh, browser Back, and deep links.
6. Document and test the production rollback point.

Detailed operational findings and recovered historical implementation material are retained privately rather than published in this public repository.

## Real-phone checklist

1. Sign up, validation, sign in, refresh, sign out, and session recovery.
2. Open and close navigation; visit every menu item; verify browser Back and deep links.
3. People and Teams: every group type, its type-specific choices, Verified, search, empty results, and profile opening.
4. Discover: search, filters, clear filters, cards, and opportunity detail.
5. Create Opportunity: all steps, keyboard behavior, validation, preview, and publish.
6. Collaboration Space: modules, tasks, reviews, milestones, decisions, chat, and member visibility.
7. Messages: list/thread/back, long messages, keyboard, send, and second-session receipt.
8. Notifications: open, dismiss, mark read, and destinations.
9. Profile and Settings: edit, save, visibility, reports, and sign out.
10. Professionals and Companies: filters, saved listings, forms, details, and inquiries.
11. Trust Center: verification displays, reports, appeals, and cross-user privacy.
12. Pricing: sandbox checkout, returns, entitlements, cancellation, and failed-payment behavior.
13. Rotation, long text, zoom, slow network, offline/reconnect, and session recovery.

The repeatable UI portions are automated in `tests/e2e`. Live service and multi-account behavior still require manual acceptance testing.
