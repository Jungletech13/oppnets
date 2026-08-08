/*
# Phase 2 Schema — Professional Marketplace, Companies, Partners, Stories, Resources

## Overview
Adds 6 new tables for the Professional Marketplace, Company Pages, Builder Partners, Success Stories, and the Resource Center.

## New Tables

1. **professionals** — Verified business profiles for service providers
   - id, owner_id, business_name, logo_url, category, description
   - services (text[]), industries_served (text[])
   - location, remote, portfolio (jsonb), certifications (text[])
   - website, years_in_business, contact_methods (text[])
   - response_time, pricing_model, availability
   - verified, premium, sponsored

2. **professional_reviews** — Reviews for professional profiles
   - id, professional_id, author_id, rating, text, at, verified

3. **companies** — Public company pages
   - id, owner_id, name, logo_url, description, mission
   - services (text[]), industries (text[]), size, location
   - website, contact_info, portfolio (jsonb), verified

4. **company_reviews** — Reviews for company pages
   - id, company_id, author_id, rating, text, at

5. **builder_partners** — Trusted business tool/service partners
   - id, name, logo_url, category, description, website, offer, educational

6. **success_stories** — Public success stories
   - id, title, summary, team_formed, opportunity_discovered
   - venture_launched, business_growth, image_url, published_at
   - participant_ids (text[]), industry

7. **resource_articles** — Resource Center content hub
   - id, title, slug (unique), category, excerpt, content
   - read_time, published_at, author_name

## Security
- RLS enabled on all tables
- professionals: public read, owner write
- professional_reviews: public read, authenticated insert (author = self)
- companies: public read, owner write
- company_reviews: public read, authenticated insert (author = self)
- builder_partners: public read, authenticated insert/update (admin-like, open for now)
- success_stories: public read, authenticated insert
- resource_articles: public read, authenticated insert/update
*/

-- Professionals
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  logo_url text DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  description text DEFAULT '',
  services text[] DEFAULT '{}',
  industries_served text[] DEFAULT '{}',
  location text DEFAULT '',
  remote boolean DEFAULT true,
  portfolio jsonb DEFAULT '[]',
  certifications text[] DEFAULT '{}',
  website text DEFAULT '',
  years_in_business int DEFAULT 1,
  contact_methods text[] DEFAULT '{}',
  response_time text DEFAULT 'Within 24 hours',
  pricing_model text DEFAULT 'Contact for quote',
  availability text DEFAULT 'Available' CHECK (availability IN ('Available', 'Limited', 'Unavailable')),
  verified boolean DEFAULT false,
  premium boolean DEFAULT false,
  sponsored boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Professional reviews
CREATE TABLE IF NOT EXISTS professional_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL DEFAULT '',
  at timestamptz DEFAULT now(),
  verified boolean DEFAULT false
);
ALTER TABLE professional_reviews ENABLE ROW LEVEL SECURITY;

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text DEFAULT '',
  description text DEFAULT '',
  mission text DEFAULT '',
  services text[] DEFAULT '{}',
  industries text[] DEFAULT '{}',
  size text DEFAULT '1-10' CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  location text DEFAULT '',
  website text DEFAULT '',
  contact_info text DEFAULT '',
  portfolio jsonb DEFAULT '[]',
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Company reviews
CREATE TABLE IF NOT EXISTS company_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL DEFAULT '',
  at timestamptz DEFAULT now()
);
ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;

-- Builder partners
CREATE TABLE IF NOT EXISTS builder_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text DEFAULT '',
  category text NOT NULL,
  description text DEFAULT '',
  website text DEFAULT '',
  offer text DEFAULT '',
  educational boolean DEFAULT true
);
ALTER TABLE builder_partners ENABLE ROW LEVEL SECURITY;

-- Success stories
CREATE TABLE IF NOT EXISTS success_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  team_formed text DEFAULT '',
  opportunity_discovered text DEFAULT '',
  venture_launched text DEFAULT '',
  business_growth text DEFAULT '',
  image_url text DEFAULT '',
  published_at date DEFAULT CURRENT_DATE,
  participant_ids text[] DEFAULT '{}',
  industry text DEFAULT 'Technology'
);
ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;

-- Resource articles
CREATE TABLE IF NOT EXISTS resource_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  read_time text DEFAULT '5 min read',
  published_at date DEFAULT CURRENT_DATE,
  author_name text DEFAULT 'Opportunity Network Team'
);
ALTER TABLE resource_articles ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Professionals: public read, owner write
DROP POLICY IF EXISTS "select_all_professionals" ON professionals;
CREATE POLICY "select_all_professionals" ON professionals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_professionals" ON professionals;
CREATE POLICY "insert_own_professionals" ON professionals FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_professionals" ON professionals;
CREATE POLICY "update_own_professionals" ON professionals FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_professionals" ON professionals;
CREATE POLICY "delete_own_professionals" ON professionals FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Professional reviews: public read, authenticated insert
DROP POLICY IF EXISTS "select_all_professional_reviews" ON professional_reviews;
CREATE POLICY "select_all_professional_reviews" ON professional_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_professional_reviews" ON professional_reviews;
CREATE POLICY "insert_own_professional_reviews" ON professional_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_professional_reviews" ON professional_reviews;
CREATE POLICY "delete_own_professional_reviews" ON professional_reviews FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Companies: public read, owner write
DROP POLICY IF EXISTS "select_all_companies" ON companies;
CREATE POLICY "select_all_companies" ON companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_companies" ON companies;
CREATE POLICY "insert_own_companies" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_companies" ON companies;
CREATE POLICY "update_own_companies" ON companies FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_companies" ON companies;
CREATE POLICY "delete_own_companies" ON companies FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Company reviews: public read, authenticated insert
DROP POLICY IF EXISTS "select_all_company_reviews" ON company_reviews;
CREATE POLICY "select_all_company_reviews" ON company_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_company_reviews" ON company_reviews;
CREATE POLICY "insert_own_company_reviews" ON company_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_company_reviews" ON company_reviews;
CREATE POLICY "delete_own_company_reviews" ON company_reviews FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Builder partners: public read, authenticated write
DROP POLICY IF EXISTS "select_all_builder_partners" ON builder_partners;
CREATE POLICY "select_all_builder_partners" ON builder_partners FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_builder_partners" ON builder_partners;
CREATE POLICY "insert_builder_partners" ON builder_partners FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_builder_partners" ON builder_partners;
CREATE POLICY "update_builder_partners" ON builder_partners FOR UPDATE TO authenticated USING (true);

-- Success stories: public read, authenticated insert
DROP POLICY IF EXISTS "select_all_success_stories" ON success_stories;
CREATE POLICY "select_all_success_stories" ON success_stories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_success_stories" ON success_stories;
CREATE POLICY "insert_success_stories" ON success_stories FOR INSERT TO authenticated WITH CHECK (true);

-- Resource articles: public read, authenticated write
DROP POLICY IF EXISTS "select_all_resource_articles" ON resource_articles;
CREATE POLICY "select_all_resource_articles" ON resource_articles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_resource_articles" ON resource_articles;
CREATE POLICY "insert_resource_articles" ON resource_articles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_resource_articles" ON resource_articles;
CREATE POLICY "update_resource_articles" ON resource_articles FOR UPDATE TO authenticated USING (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_professionals_category ON professionals(category);
CREATE INDEX IF NOT EXISTS idx_professionals_location ON professionals(location);
CREATE INDEX IF NOT EXISTS idx_professionals_owner ON professionals(owner_id);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_prof ON professional_reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_industries ON companies USING gin(industries);
CREATE INDEX IF NOT EXISTS idx_company_reviews_co ON company_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_builder_partners_category ON builder_partners(category);
CREATE INDEX IF NOT EXISTS idx_success_stories_industry ON success_stories(industry);
CREATE INDEX IF NOT EXISTS idx_resource_articles_slug ON resource_articles(slug);
CREATE INDEX IF NOT EXISTS idx_resource_articles_category ON resource_articles(category);
