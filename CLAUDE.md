# Opportunity Network — Master Build Prompt

## What This Project Is

Opportunity Network is a trust-first platform where people discover opportunities, find verified collaborators, build teams, and execute ventures together. It is not a social network — it is an Opportunity Operating System.

**Core mission:** Every connection should lead to an opportunity.

**Product philosophy (do not change):**
- Every connection should lead to an opportunity.
- Trust through verified facts, not scores.
- AI recommends. People decide.
- Builders come first.
- Collaboration over content.
- Opportunities over attention.
- Execution over networking.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (custom design system, 8px spacing, 6+ color ramps)
- **Icons:** lucide-react
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions, Storage)
- **Path alias:** `@/` maps to `src/`
- **No additional UI/theme packages** unless explicitly requested

---

## What Has Been Built (Phase 1 — Complete + Phase 2 — In Progress)

### Pages
- **LandingPage** — Public marketing page with hero, features, philosophy
- **AuthPage** — Email/password sign-in and sign-up (Supabase Auth)
- **HomePage** — Action Center: overdue tasks, blocked work, pending approvals, upcoming milestones, check-ins due, active spaces, recommended opportunities/collaborators, recent activity
- **DiscoverPage** — Opportunity discovery with filters (category, stage, location, remote, compensation, time commitment)
- **PeoplePage** — Builder directory with filtering by skills, industry, verification, location
- **MyOpportunitiesPage** — User's own posted opportunities
- **CreateOpportunityPage** — 5-step wizard (Basals, Details, Roles & Skills, DNA, Review & Publish) with helper text, AI suggest buttons, localStorage draft saving
- **OpportunityDetailPage** — Full opportunity view with roles, DNA, owner profile, apply flow
- **SpacePage** — Collaboration Space with mission banner, tasks, milestones, files, decisions, activity log, check-ins, collaboration record
- **MessagesPage** — Conversations with collaboration context bar (tasks, decisions, files) and action items
- **NotificationsPage** — Split into "Requires Action" and "Informational Updates" with one-click actions
- **ProfilePage** — Builder profile with what I'm building, what I'm looking for, current opportunities, venture history, collaboration history, verification badges
- **TrustCenterPage** — 6-layer trust system, verification timeline, collaboration reviews, fraud alerts, community standing (no numeric trust score)
- **SettingsPage** — Account settings with sign-out

### Components
- `AppShell` — Navigation sidebar + top bar
- `OpportunityCard` — Reusable opportunity display
- `PeopleCards` — PersonCard, GroupCard with TrustIndicators
- `ui.tsx` — Badge, Card, Avatar, ProgressBar, StatusPill, SectionHeader, EmptyState, Modal, Field, BetaNote, TrustIndicators, VerificationPill

### Architecture
- `src/store.tsx` — Global app state (React Context) with demo data, navigation, CRUD operations
- `src/data.ts` — Seed/demo data (8 profiles, 6 opportunities, 4 collaboration spaces, conversations, notifications, trust data)
- `src/data-phase2.ts` — Phase 2 demo data (6 professionals, 3 companies, 10 builder partners, 3 success stories, 6 resource articles, 4 pricing plans)
- `src/types.ts` — Full TypeScript type system (Phase 1 + Phase 2 types)
- `src/lib/supabase.ts` — Supabase client singleton
- `src/lib/auth.tsx` — AuthProvider + useAuth hook (Supabase session management)
- `src/lib/queries.ts` — Typed data access layer (fetch/create/update + realtime subscriptions)

### Database (Supabase — 27 tables deployed)
- Phase 1: profiles, opportunities, opportunity_roles, collaboration_spaces, space_members, tasks, checklist_items, milestones, space_files, decisions, activity_log, conversations, conversation_participants, messages, notifications, verification_claims, verification_timeline, collaboration_reviews, fraud_alerts, opportunity_applications
- Phase 2: professionals, professional_reviews, companies, company_reviews, builder_partners, success_stories, resource_articles
- RLS enabled on all tables (4 policies per CRUD verb, ownership/membership scoped)
- Realtime enabled on: messages, notifications, tasks, activity_log, checklist_items
- Triggers: auto-create profile on signup, auto-update updated_at on profiles

### Design System
- Color ramps: brand (blue), accent (green), neutral (ink/slate), success, warning, error
- 8px spacing system
- Font: system sans-serif with 3 weights max
- Line spacing: 150% body, 120% headings
- No purple/indigo/violet hues
- Responsive: mobile to desktop breakpoints
- Micro-interactions: hover states, transitions, subtle animations

---

## Phase 2 — Feature Expansion Specification

Continue building using the existing design system, architecture, Supabase integration, and trust-first philosophy. Do not redesign completed pages unless required to support the features below. Preserve the existing UI style and production-ready architecture.

### 1. Professional Marketplace

Expand beyond builders by introducing a Professional Marketplace.

Professionals can create verified business profiles:
- Attorneys, CPAs, Bookkeepers, Marketing agencies, Designers, Developers, Contractors, Architects, Engineers, Insurance professionals, Business consultants, HR firms, Payroll providers, Lenders, Grant writers, Financial advisors, Commercial real estate agents, Manufacturers, Logistics providers, other business service providers

Each professional profile includes:
- Business name, logo, description
- Services offered, industries served
- Location, remote availability
- Portfolio, certifications
- Website, years in business
- Contact methods, response time
- Pricing model, availability
- Reviews, verified badges

Professionals may upgrade to premium plans for enhanced visibility. Sponsored listings must always be clearly labeled.

### 2. Company Pages

Allow companies to create public pages with:
- Company overview, mission, services, industries
- Open opportunities, team members
- Reviews, portfolio, verified status
- Website, contact information

Companies can post opportunities directly.

### 3. Opportunity SEO System

Every public opportunity generates an SEO-friendly page (e.g. `/opportunity/build-real-estate-investment-team`).

Include: meta title, meta description, Open Graph, Schema.org structured data, canonical URLs, share previews.

### 4. Public Builder Profiles

Allow builders to choose whether profiles are public.

Public pages include: skills, industries, venture history, public collaborations, public opportunities, achievements, verification badges. Private information remains hidden.

### 5. Public Professional Profiles

SEO-friendly profile pages for professionals with: search engine indexing, service categories, local SEO, industry filtering, portfolio pages.

### 6. Industry Landing Pages

Auto-generate landing pages for industries: Technology, Real Estate, Restaurants, E-Commerce, Manufacturing, Healthcare, Nonprofits, Franchises, Construction, Creative Services.

These pages aggregate opportunities, professionals, companies, and builders.

### 7. Location Pages

Generate SEO pages for countries, states, cities (e.g. "Miami Opportunities", "Dallas Startups", "New Jersey Builders").

Include local professionals, local opportunities, local companies.

### 8. Opportunity Resource Center

Content hub with articles: "How to Find a Business Partner", "How to Start a Startup", "Startup Checklists", "Business Formation Guides", "Real Estate Investing Guides", "Grant Resources".

Improves SEO and educates users.

### 9. Success Stories

Public success story system showing: team formed, opportunity discovered, venture launched, business growth. Allow rich media.

### 10. Builder Directory

Advanced filtering by: skills, industry, experience, location, remote, availability, verification, interests.

### 11. Professional Directory

Search professionals by: service, industry, location, rating, verification, pricing, availability.

### 12. Company Directory

Search companies by: industry, size, services, hiring status, opportunities.

### 13. Opportunity Discovery Improvements

Expand search with: skills, industry, investment size, remote, location, experience, funding stage, time commitment, compensation, opportunity type.

### 14. Pricing & Subscription Foundation

Implement pricing architecture only (no payment processing yet).

**Builder Free:** No AI, core networking, collaboration, messaging, tasks, opportunity creation.

**Builder Pro:** AI, advanced search, priority placement, analytics, enhanced recommendations.

**Professional:** Business profiles, lead generation, analytics, premium placement, sponsored listings.

**Company:** Multiple users, admin tools, recruiting, advanced analytics, company opportunities.

### 15. Builder Partners

Dedicated section featuring trusted business tools and services. Categories: Banking, Accounting, Legal, Insurance, Payments, Cloud infrastructure, Productivity, CRM, Marketing, HR.

Partner listings should be educational and useful, not intrusive advertisements.

### 16. Trust Enhancements

Extend Trust Center with: business verification, professional verification, company verification, verification progress, trust education, fraud reporting, appeal workflow UI.

### 17. SEO Infrastructure

Implement: XML sitemap generation, robots.txt, structured data, Open Graph, Twitter Cards, breadcrumb schema, canonical URLs, dynamic metadata, automatic internal linking.

### 18. Analytics Dashboard

Builders see: profile views, opportunity views, applications, messages, connections, engagement.

Professionals additionally see: lead views, inquiry volume, conversion trends, company analytics.

### 19. Marketplace Health

Internal admin dashboards for: new opportunities, active collaborations, professional growth, company growth, marketplace liquidity metrics, category growth, regional activity.

### 20. Preserve Existing Product Philosophy

Do not change the core mission. Continue reinforcing all philosophy points above.

---

## Overall Goal

The platform should feel like the world's first **Opportunity Operating System** — not just another social network.

Users should be able to:
1. Discover opportunities.
2. Find trusted collaborators.
3. Build teams.
4. Work together in Collaboration Spaces.
5. Hire professionals.
6. Grow companies.
7. Share success stories.
8. Be discovered through SEO.
9. Build a lasting reputation through verified accomplishments.

---

## Final Instruction

**Do not redesign the existing application. Expand it. Maintain visual consistency, preserve the established design language, and build these capabilities as integrated features of the current platform. Prioritize scalability, accessibility, responsive design, and production readiness. Every new feature should strengthen the core mission: *Every connection should lead to an opportunity.***

---

## Build Guidelines

- Use Supabase for all data persistence, auth, and realtime.
- Use the `mcp__supabase__apply_migration` tool for all DDL (CREATE TABLE, ALTER, RLS policies). Never raw SQL outside that tool.
- Enable RLS on every new table. Write 4 separate policies (one per CRUD verb). Scope `TO authenticated` with ownership/membership checks.
- Owner columns must have `DEFAULT auth.uid()` so frontend inserts that omit the owner still succeed.
- Use `maybeSingle()` for zero-or-one row queries, never `single()`.
- Edge functions require the exact CORS header set on every response.
- Match existing code conventions: naming, file layout, error handling, import style.
- Use `@/` path alias for all imports from `src/`.
- Use lucide-react for all icons.
- Never use purple/indigo/violet hues in the design.
- Run `npm run build` before finishing to verify the project builds.
- Do not add features, refactor, or introduce abstractions beyond what the task requires.
- Default to writing no comments. Only add comments when the WHY is non-obvious.
