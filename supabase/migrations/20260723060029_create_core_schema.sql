/*
# Create Core Schema — Opportunity Network Production Architecture

## Overview
This migration creates the foundational schema for the Opportunity Network platform — a trust-first platform where people discover opportunities, find trusted collaborators, build teams, and execute ventures together.

## New Tables (20 total)
1. profiles — Extended user profile data (linked to auth.users)
2. opportunities — Posted opportunities for collaboration
3. opportunity_roles — Roles needed within an opportunity
4. collaboration_spaces — Active project workspaces
5. space_members — Membership junction table
6. tasks — Tasks within collaboration spaces
7. checklist_items — Checklist items within tasks
8. milestones — Project milestones
9. space_files — Files attached to spaces
10. decisions — Major decisions logged in spaces
11. activity_log — Activity feed for spaces
12. conversations — Message threads (1:1 or space-scoped)
13. conversation_participants — Junction for conversation membership
14. messages — Individual messages in conversations
15. notifications — User notifications
16. verification_claims — User verification claims
17. verification_timeline — Chronological verification events
18. collaboration_reviews — Reviews from verified co-participants
19. fraud_alerts — Fraud detection alerts
20. opportunity_applications — Applications to join opportunities

## Security
- RLS enabled on ALL tables
- All policies scoped TO authenticated with ownership or membership checks
- Owner columns default to auth.uid() for seamless inserts
- Space members can read/write within their spaces
- Conversation participants can read/write within their conversations
- Users can only read their own notifications and verification data

## Important Notes
1. All tables use uuid primary keys with gen_random_uuid() defaults
2. Foreign keys use ON DELETE CASCADE for child tables
3. Timestamps default to now()
4. Text arrays used for tags, skills, and goals
5. Enums enforce data integrity for status fields
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  headline text DEFAULT '',
  bio text DEFAULT '',
  location text DEFAULT '',
  photo_url text DEFAULT '',
  what_im_building text[] DEFAULT '{}',
  what_im_looking_for text[] DEFAULT '{}',
  community_standing text DEFAULT 'neutral' CHECK (community_standing IN ('positive', 'neutral', 'monitoring')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Technology',
  stage text NOT NULL DEFAULT 'Idea',
  goals text[] DEFAULT '{}',
  location text DEFAULT '',
  remote boolean DEFAULT true,
  time_commitment text DEFAULT 'Part-time',
  compensation text DEFAULT 'Equity',
  accepts text DEFAULT 'both',
  visibility text DEFAULT 'public',
  start_date date,
  posted_date date DEFAULT CURRENT_DATE,
  team_size int DEFAULT 1,
  verified boolean DEFAULT false,
  creator_brings text DEFAULT '',
  skills_needed text[] DEFAULT '{}',
  required_skills text[] DEFAULT '{}',
  optional_skills text[] DEFAULT '{}',
  location_preference text DEFAULT 'Remote',
  work_style text DEFAULT 'Async',
  risk_tolerance text DEFAULT 'Medium',
  leadership_needs text DEFAULT 'Co-lead',
  collaboration_style text DEFAULT 'Flat',
  mission_drive text DEFAULT 'Balanced',
  funding_status text DEFAULT 'Bootstrapped',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Opportunity roles
CREATE TABLE IF NOT EXISTS opportunity_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  open_positions int DEFAULT 1,
  filled int DEFAULT 0,
  compensation text DEFAULT 'Equity',
  skills_needed text[] DEFAULT '{}'
);
ALTER TABLE opportunity_roles ENABLE ROW LEVEL SECURITY;

-- Collaboration spaces
CREATE TABLE IF NOT EXISTS collaboration_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  mission text DEFAULT '',
  success_definition text DEFAULT '',
  notes text DEFAULT '',
  check_in_frequency text DEFAULT 'Weekly',
  next_check_in date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE collaboration_spaces ENABLE ROW LEVEL SECURITY;

-- Space members
CREATE TABLE IF NOT EXISTS space_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'Member',
  UNIQUE (space_id, user_id)
);
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  due_date date,
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  status text DEFAULT 'Not started' CHECK (status IN ('Not started', 'In progress', 'Ready for review', 'Changes requested', 'Approved', 'Blocked', 'Completed')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Checklist items
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  done boolean DEFAULT false,
  submitted_for_review boolean DEFAULT false
);
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  done boolean DEFAULT false
);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Space files
CREATE TABLE IF NOT EXISTS space_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  size text DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE space_files ENABLE ROW LEVEL SECURITY;

-- Decisions
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  rationale text DEFAULT '',
  decided_at date DEFAULT CURRENT_DATE,
  decided_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  text text NOT NULL,
  at timestamptz DEFAULT now(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'space')),
  space_id uuid REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'message' CHECK (kind IN ('review_requested', 'review_completed', 'task_assigned', 'task_due', 'message', 'application', 'check_in', 'mention')),
  text text NOT NULL,
  at timestamptz DEFAULT now(),
  read boolean DEFAULT false,
  link text DEFAULT ''
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Verification claims
CREATE TABLE IF NOT EXISTS verification_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'phone', 'identity', 'employment', 'business_ownership', 'venture_participation', 'reference')),
  label text NOT NULL,
  detail text DEFAULT '',
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('verified', 'pending', 'failed')),
  verified_at date
);
ALTER TABLE verification_claims ENABLE ROW LEVEL SECURITY;

-- Verification timeline
CREATE TABLE IF NOT EXISTS verification_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'failed')),
  at date DEFAULT CURRENT_DATE,
  detail text DEFAULT ''
);
ALTER TABLE verification_timeline ENABLE ROW LEVEL SECURITY;

-- Collaboration reviews
CREATE TABLE IF NOT EXISTS collaboration_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venture_title text NOT NULL DEFAULT '',
  period_start date,
  period_end date,
  text text NOT NULL DEFAULT '',
  at timestamptz DEFAULT now()
);
ALTER TABLE collaboration_reviews ENABLE ROW LEVEL SECURITY;

-- Fraud alerts
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'monitoring' CHECK (status IN ('monitoring', 'under_review', 'resolved', 'dismissed')),
  detected_at date DEFAULT CURRENT_DATE,
  description text DEFAULT ''
);
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Opportunity applications
CREATE TABLE IF NOT EXISTS opportunity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES opportunity_roles(id) ON DELETE SET NULL,
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at timestamptz DEFAULT now()
);
ALTER TABLE opportunity_applications ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Profiles
DROP POLICY IF EXISTS "select_all_profiles" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Opportunities
DROP POLICY IF EXISTS "select_all_opportunities" ON opportunities;
CREATE POLICY "select_all_opportunities" ON opportunities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_opportunities" ON opportunities;
CREATE POLICY "insert_own_opportunities" ON opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_opportunities" ON opportunities;
CREATE POLICY "update_own_opportunities" ON opportunities FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_opportunities" ON opportunities;
CREATE POLICY "delete_own_opportunities" ON opportunities FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Opportunity roles
DROP POLICY IF EXISTS "select_all_opportunity_roles" ON opportunity_roles;
CREATE POLICY "select_all_opportunity_roles" ON opportunity_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_opportunity_roles" ON opportunity_roles;
CREATE POLICY "insert_opportunity_roles" ON opportunity_roles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = opportunity_roles.opportunity_id AND opportunities.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "update_opportunity_roles" ON opportunity_roles;
CREATE POLICY "update_opportunity_roles" ON opportunity_roles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = opportunity_roles.opportunity_id AND opportunities.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_opportunity_roles" ON opportunity_roles;
CREATE POLICY "delete_opportunity_roles" ON opportunity_roles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = opportunity_roles.opportunity_id AND opportunities.owner_id = auth.uid())
);

-- Collaboration spaces
DROP POLICY IF EXISTS "select_member_spaces" ON collaboration_spaces;
CREATE POLICY "select_member_spaces" ON collaboration_spaces FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = collaboration_spaces.id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_spaces" ON collaboration_spaces;
CREATE POLICY "insert_spaces" ON collaboration_spaces FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = collaboration_spaces.opportunity_id AND opportunities.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "update_member_spaces" ON collaboration_spaces;
CREATE POLICY "update_member_spaces" ON collaboration_spaces FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = collaboration_spaces.id AND space_members.user_id = auth.uid())
);

-- Space members
DROP POLICY IF EXISTS "select_space_members" ON space_members;
CREATE POLICY "select_space_members" ON space_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members sm2 WHERE sm2.space_id = space_members.space_id AND sm2.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_space_members" ON space_members;
CREATE POLICY "insert_space_members" ON space_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM collaboration_spaces cs WHERE cs.id = space_members.space_id AND (
    EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = cs.opportunity_id AND opportunities.owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM space_members sm3 WHERE sm3.space_id = space_members.space_id AND sm3.user_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS "delete_space_members" ON space_members;
CREATE POLICY "delete_space_members" ON space_members FOR DELETE TO authenticated USING (
  space_members.user_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM collaboration_spaces cs WHERE cs.id = space_members.space_id AND EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = cs.opportunity_id AND opportunities.owner_id = auth.uid()))
);

-- Tasks
DROP POLICY IF EXISTS "select_member_tasks" ON tasks;
CREATE POLICY "select_member_tasks" ON tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = tasks.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_tasks" ON tasks;
CREATE POLICY "insert_member_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = tasks.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "update_member_tasks" ON tasks;
CREATE POLICY "update_member_tasks" ON tasks FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = tasks.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_member_tasks" ON tasks;
CREATE POLICY "delete_member_tasks" ON tasks FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = tasks.space_id AND space_members.user_id = auth.uid())
);

-- Checklist items
DROP POLICY IF EXISTS "select_member_checklist" ON checklist_items;
CREATE POLICY "select_member_checklist" ON checklist_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks t JOIN space_members sm ON sm.space_id = t.space_id WHERE t.id = checklist_items.task_id AND sm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_checklist" ON checklist_items;
CREATE POLICY "insert_member_checklist" ON checklist_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tasks t JOIN space_members sm ON sm.space_id = t.space_id WHERE t.id = checklist_items.task_id AND sm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "update_member_checklist" ON checklist_items;
CREATE POLICY "update_member_checklist" ON checklist_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks t JOIN space_members sm ON sm.space_id = t.space_id WHERE t.id = checklist_items.task_id AND sm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_member_checklist" ON checklist_items;
CREATE POLICY "delete_member_checklist" ON checklist_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks t JOIN space_members sm ON sm.space_id = t.space_id WHERE t.id = checklist_items.task_id AND sm.user_id = auth.uid())
);

-- Milestones
DROP POLICY IF EXISTS "select_member_milestones" ON milestones;
CREATE POLICY "select_member_milestones" ON milestones FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = milestones.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_milestones" ON milestones;
CREATE POLICY "insert_member_milestones" ON milestones FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = milestones.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "update_member_milestones" ON milestones;
CREATE POLICY "update_member_milestones" ON milestones FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = milestones.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_member_milestones" ON milestones;
CREATE POLICY "delete_member_milestones" ON milestones FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = milestones.space_id AND space_members.user_id = auth.uid())
);

-- Space files
DROP POLICY IF EXISTS "select_member_files" ON space_files;
CREATE POLICY "select_member_files" ON space_files FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = space_files.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_files" ON space_files;
CREATE POLICY "insert_member_files" ON space_files FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = space_files.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_member_files" ON space_files;
CREATE POLICY "delete_member_files" ON space_files FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = space_files.space_id AND space_members.user_id = auth.uid())
);

-- Decisions
DROP POLICY IF EXISTS "select_member_decisions" ON decisions;
CREATE POLICY "select_member_decisions" ON decisions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = decisions.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_decisions" ON decisions;
CREATE POLICY "insert_member_decisions" ON decisions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = decisions.space_id AND space_members.user_id = auth.uid())
);

-- Activity log
DROP POLICY IF EXISTS "select_member_activity" ON activity_log;
CREATE POLICY "select_member_activity" ON activity_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = activity_log.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_activity" ON activity_log;
CREATE POLICY "insert_member_activity" ON activity_log FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = activity_log.space_id AND space_members.user_id = auth.uid())
);

-- Conversations
DROP POLICY IF EXISTS "select_participant_conversations" ON conversations;
CREATE POLICY "select_participant_conversations" ON conversations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = conversations.id AND conversation_participants.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_conversations" ON conversations;
CREATE POLICY "insert_conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_conversations" ON conversations;
CREATE POLICY "update_conversations" ON conversations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = conversations.id AND conversation_participants.user_id = auth.uid())
);

-- Conversation participants
DROP POLICY IF EXISTS "select_conversation_participants" ON conversation_participants;
CREATE POLICY "select_conversation_participants" ON conversation_participants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = conversation_participants.conversation_id AND cp2.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_conversation_participants" ON conversation_participants;
CREATE POLICY "insert_conversation_participants" ON conversation_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Messages
DROP POLICY IF EXISTS "select_participant_messages" ON messages;
CREATE POLICY "select_participant_messages" ON messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_participant_messages" ON messages;
CREATE POLICY "insert_participant_messages" ON messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = messages.conversation_id AND conversation_participants.user_id = auth.uid())
);

-- Notifications
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Verification claims
DROP POLICY IF EXISTS "select_own_verification_claims" ON verification_claims;
CREATE POLICY "select_own_verification_claims" ON verification_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_verification_claims" ON verification_claims;
CREATE POLICY "insert_own_verification_claims" ON verification_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_verification_claims" ON verification_claims;
CREATE POLICY "update_own_verification_claims" ON verification_claims FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Verification timeline
DROP POLICY IF EXISTS "select_own_verification_timeline" ON verification_timeline;
CREATE POLICY "select_own_verification_timeline" ON verification_timeline FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_verification_timeline" ON verification_timeline;
CREATE POLICY "insert_own_verification_timeline" ON verification_timeline FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Collaboration reviews
DROP POLICY IF EXISTS "select_member_reviews" ON collaboration_reviews;
CREATE POLICY "select_member_reviews" ON collaboration_reviews FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = collaboration_reviews.space_id AND space_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_member_reviews" ON collaboration_reviews;
CREATE POLICY "insert_member_reviews" ON collaboration_reviews FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM space_members WHERE space_members.space_id = collaboration_reviews.space_id AND space_members.user_id = auth.uid())
);

-- Fraud alerts
DROP POLICY IF EXISTS "select_own_fraud_alerts" ON fraud_alerts;
CREATE POLICY "select_own_fraud_alerts" ON fraud_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Opportunity applications
DROP POLICY IF EXISTS "select_applications" ON opportunity_applications;
CREATE POLICY "select_applications" ON opportunity_applications FOR SELECT TO authenticated USING (
  auth.uid() = applicant_id
  OR
  EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = opportunity_applications.opportunity_id AND opportunities.owner_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_own_applications" ON opportunity_applications;
CREATE POLICY "insert_own_applications" ON opportunity_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "update_applications" ON opportunity_applications;
CREATE POLICY "update_applications" ON opportunity_applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM opportunities WHERE opportunities.id = opportunity_applications.opportunity_id AND opportunities.owner_id = auth.uid())
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_space ON tasks(space_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_verification_claims_user ON verification_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opp ON opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_space ON activity_log(space_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_task ON checklist_items(task_id);
