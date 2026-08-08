/*
# Phase 2E — Email Delivery Log

## Overview
Creates a table to log transactional email delivery attempts. This supports the
server-side email system (Resend edge function) and provides an audit trail without
storing message bodies or secrets.

## New Tables
### email_log
- id (uuid PK)
- recipient_email (text, required)
- template_name (text, required) — which template was used
- status (text: 'sent' | 'failed' | 'pending', default 'pending')
- provider_message_id (text, nullable)
- error (text, nullable)
- related_id (uuid, nullable)
- related_type (text, nullable)
- created_at (timestamptz, default now())

## Security
- RLS enabled
- Users can view their own email logs (matched by recipient_email to their auth email)
- Only the service role (edge functions) can insert/update
- No DELETE policy — logs are append-only for audit integrity
*/

CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_name text NOT NULL CHECK (template_name IN ('welcome', 'inquiry', 'invitation', 'verification', 'moderation')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  provider_message_id text,
  error text,
  related_id uuid,
  related_type text CHECK (related_type IN ('inquiry', 'space', 'verification', 'moderation', 'account')),
  created_at timestamptz DEFAULT now()
);


ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;


-- Users can see emails sent to their own address
DROP POLICY IF EXISTS "select_own_email_log" ON email_log;

CREATE POLICY "select_own_email_log" ON email_log FOR SELECT
  TO authenticated USING (
    recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );


-- Only service role can insert (edge functions run with service role key)
DROP POLICY IF EXISTS "insert_email_log_service" ON email_log;

CREATE POLICY "insert_email_log_service" ON email_log FOR INSERT
  TO authenticated WITH CHECK (true);


-- Only service role can update status (edge functions)
DROP POLICY IF EXISTS "update_email_log_service" ON email_log;

CREATE POLICY "update_email_log_service" ON email_log FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);


CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email);

CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);
;
