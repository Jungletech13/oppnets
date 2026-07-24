/*
# Phase 2B — Inquiry & Saved Listings

## Overview
Adds two new tables to support functional marketplace workflows:
1. professional_inquiries — contact/inquiry messages sent to professionals
2. saved_listings — bookmark feature for professionals and companies

## New Tables

### professional_inquiries
- id (uuid PK)
- professional_id (uuid FK → professionals, cascade delete)
- sender_id (uuid, default auth.uid())
- message (text, required)
- status (text: 'pending' | 'responded' | 'closed', default 'pending')
- created_at (timestamptz)
- The sender contacts a professional through the platform instead of external email.

### saved_listings
- id (uuid PK)
- user_id (uuid, default auth.uid())
- listing_type (text: 'professional' | 'company')
- listing_id (text — stores the demo data ID or UUID)
- created_at (timestamptz)
- Unique constraint on (user_id, listing_type, listing_id) prevents duplicate saves.

## Security
- professional_inquiries: authenticated insert (sender = self), select limited to sender or professional owner
- saved_listings: owner-scoped CRUD (user can only see/manage their own saved listings)
*/

-- Professional inquiries
CREATE TABLE IF NOT EXISTS professional_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid(),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE professional_inquiries ENABLE ROW LEVEL SECURITY;

-- Saved listings
CREATE TABLE IF NOT EXISTS saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  listing_type text NOT NULL CHECK (listing_type IN ('professional', 'company')),
  listing_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, listing_type, listing_id)
);
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Professional inquiries: sender can see their sent inquiries, professional owner can see received inquiries
DROP POLICY IF EXISTS "select_own_inquiries_sent" ON professional_inquiries;
CREATE POLICY "select_own_inquiries_sent" ON professional_inquiries FOR SELECT
  TO authenticated USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "select_inquiries_for_own_professional" ON professional_inquiries;
CREATE POLICY "select_inquiries_for_own_professional" ON professional_inquiries FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM professionals WHERE professionals.id = professional_inquiries.professional_id AND professionals.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_inquiries" ON professional_inquiries;
CREATE POLICY "insert_own_inquiries" ON professional_inquiries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_inquiry_status_owner" ON professional_inquiries;
CREATE POLICY "update_inquiry_status_owner" ON professional_inquiries FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM professionals WHERE professionals.id = professional_inquiries.professional_id AND professionals.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM professionals WHERE professionals.id = professional_inquiries.professional_id AND professionals.owner_id = auth.uid())
  );

-- Saved listings: owner-scoped CRUD
DROP POLICY IF EXISTS "select_own_saved_listings" ON saved_listings;
CREATE POLICY "select_own_saved_listings" ON saved_listings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_listings" ON saved_listings;
CREATE POLICY "insert_own_saved_listings" ON saved_listings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_listings" ON saved_listings;
CREATE POLICY "delete_own_saved_listings" ON saved_listings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_professional_inquiries_prof ON professional_inquiries(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_inquiries_sender ON professional_inquiries(sender_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_user ON saved_listings(user_id);
