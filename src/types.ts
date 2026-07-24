// Core domain types for Opportunity Network

export type ID = string;

export type Industry =
  | 'Real Estate'
  | 'Cleaning & Services'
  | 'Nonprofit'
  | 'Technology'
  | 'Film & Media'
  | 'E-commerce'
  | 'Food & Restaurant'
  | 'Finance'
  | 'Consulting'
  | 'Community'
  | 'Creative';

export type OpportunityStage =
  | 'Idea'
  | 'Recruiting'
  | 'Planning'
  | 'Building'
  | 'Operating'
  | 'Growing'
  | 'Paused'
  | 'Completed'
  | 'Archived';

export type Compensation =
  | 'Paid'
  | 'Equity'
  | 'Volunteer'
  | 'Partnership'
  | 'Negotiable';

export type WorkStyle = 'Async' | 'Synchronous' | 'Hybrid' | 'On-site';
export type CollaborationStyle = 'Hierarchical' | 'Flat' | 'Consensus' | 'Self-directed';
export type MissionDrive = 'Mission-driven' | 'Profit-driven' | 'Balanced';

export type VerificationType =
  | 'email'
  | 'phone'
  | 'identity'
  | 'business_ownership'
  | 'employment'
  | 'education'
  | 'certification'
  | 'venture_participation'
  | 'reference';

export type VerificationState = 'verified' | 'pending' | 'unverified' | 'could_not_verify';

export interface VerificationClaim {
  id: ID;
  type: VerificationType;
  state: VerificationState;
  label: string;
  detail?: string;
  verifiedAt?: string;
}

export interface Skill {
  id: ID;
  name: string;
  category: string;
}

export interface VentureOutcome {
  id: ID;
  title: string;
  role: string;
  outcome:
    | 'Active'
    | 'Completed'
    | 'Launched'
    | 'Operating'
    | 'Acquired'
    | 'Sold'
    | 'Paused'
    | 'Closed'
    | 'Archived';
  visibility: 'private' | 'participants' | 'profile' | 'public';
  year: number;
  industry: Industry;
  summary: string;
}

export interface Profile {
  id: ID;
  name: string;
  photoUrl: string;
  location: string;
  headline: string;
  bio: string;
  skills: string[];
  interests: string[];
  industries: Industry[];
  availability: 'Available' | 'Limited' | 'Unavailable';
  timeCommitment: 'Light' | 'Part-time' | 'Full-time';
  opportunitiesSought: string[];
  buildingIds: ID[];
  ventureHistory: VentureOutcome[];
  collaborationHistory: { partnerId: ID; count: number; summary: string }[];
  rolesHeld: string[];
  endorsements: { fromId: ID; text: string; skill: string }[];
  verifications: VerificationClaim[];
  communityStanding?: 'positive' | 'neutral' | 'monitoring';
}

export type GroupKind = 'individual' | 'pair' | 'group' | 'team';

export interface CollaborationGroup {
  id: ID;
  kind: GroupKind;
  name: string;
  memberIds: ID[];
  combinedSkills: string[];
  industries: Industry[];
  venturesCompletedTogether: number;
  activeVentures: number;
  historyLengthMonths: number;
  availabilityGroup: 'Available' | 'Limited' | 'Unavailable';
  availabilityIndividual: Record<ID, 'Available' | 'Limited' | 'Unavailable'>;
  matchReasons: string[];
}

export interface OpportunityRole {
  id: ID;
  title: string;
  skillsNeeded: string[];
  openPositions: number;
  compensation: Compensation;
  filled: number;
}

export interface OpportunityDNA {
  industry: Industry;
  stage: OpportunityStage;
  requiredSkills: string[];
  optionalSkills: string[];
  timeCommitment: 'Light' | 'Part-time' | 'Full-time';
  locationPreference: 'Remote' | 'Local' | 'Hybrid' | 'On-site';
  workStyle: WorkStyle;
  riskTolerance: 'Low' | 'Medium' | 'High';
  leadershipNeeds: 'Lead' | 'Co-lead' | 'Contributor';
  collaborationStyle: CollaborationStyle;
  missionDrive: MissionDrive;
  fundingStatus: 'Bootstrapped' | 'Self-funded' | 'Seeking funding' | 'Funded';
}

export interface Opportunity {
  id: ID;
  title: string;
  description: string;
  category: Industry;
  stage: OpportunityStage;
  goals: string[];
  location: string;
  remote: boolean;
  timeCommitment: 'Light' | 'Part-time' | 'Full-time';
  roles: OpportunityRole[];
  skillsNeeded: string[];
  creatorBrings: string;
  compensation: Compensation;
  accepts: 'individuals' | 'groups' | 'both';
  startDate: string;
  visibility: 'public' | 'network' | 'invite';
  postedDate: string;
  teamSize: number;
  verified: boolean;
  ownerId: ID;
  dna: OpportunityDNA;
  matchReasons?: string[];
}

export type TaskStatus =
  | 'Not started'
  | 'In progress'
  | 'Blocked'
  | 'Ready for review'
  | 'Changes requested'
  | 'Needs discussion'
  | 'Approved'
  | 'Completed';

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
  submittedForReview?: boolean;
}

export interface TaskComment {
  id: ID;
  authorId: ID;
  text: string;
  at: string;
}

export interface TaskRevision {
  version: number;
  at: string;
  by: ID;
  note: string;
  status: TaskStatus;
}

export interface Feedback {
  id: ID;
  reviewerId: ID;
  whatNeedsToChange: string;
  whyItNeedsToChange: string;
  required: boolean;
  comments: string;
  at: string;
}

export interface Task {
  id: ID;
  title: string;
  description: string;
  ownerId: ID;
  reviewerId: ID;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: TaskStatus;
  checklist: ChecklistItem[];
  dependencies: ID[];
  comments: TaskComment[];
  revisions: TaskRevision[];
  feedback?: Feedback;
}

export type ModuleKind =
  | 'team_chat'
  | 'tasks'
  | 'calendar'
  | 'milestones'
  | 'files'
  | 'notes'
  | 'budget'
  | 'contacts'
  | 'vendors'
  | 'customer_pipeline'
  | 'property_tracker'
  | 'equipment_tracker'
  | 'investors'
  | 'hiring'
  | 'project_timeline'
  | 'decision_log'
  | 'collaboration_record';

export interface WorkspaceModule {
  kind: ModuleKind;
  label: string;
  pinned: boolean;
  visible: boolean;
  order: number;
}

export interface Milestone {
  id: ID;
  title: string;
  dueDate: string;
  done: boolean;
  description?: string;
}

export interface Decision {
  id: ID;
  title: string;
  decidedAt: string;
  by: ID;
  rationale: string;
}

export interface CollaborationRecord {
  projectName: string;
  opportunityCreatorId: ID;
  ideaOrigin: string;
  beganAt: string;
  participants: { profileId: ID; role: string; expectedContribution: string; responsibilities: string }[];
  goals: string[];
  milestones: string[];
  communicationExpectations: string;
  majorDecisions: Decision[];
  acknowledgments: ID[];
}

export type CheckInFrequency = 'Weekly' | 'Monthly' | 'Quarterly' | 'Custom';

export interface CheckIn {
  id: ID;
  at: string;
  frequency: CheckInFrequency;
  responses: { question: string; answer: string }[];
  notes?: string;
}

export interface CollaborationSpace {
  id: ID;
  opportunityId: ID;
  name: string;
  description: string;
  mission?: string;
  successDefinition?: string;
  memberIds: ID[];
  roles: Record<ID, string>;
  tasks: Task[];
  milestones: Milestone[];
  files: { id: ID; name: string; size: string; at: string }[];
  notes: string;
  decisions: Decision[];
  activity: { id: ID; at: string; text: string; actorId?: ID }[];
  modules: WorkspaceModule[];
  record: CollaborationRecord;
  checkIns: CheckIn[];
  checkInFrequency: CheckInFrequency;
  nextCheckIn: string;
}

export interface Conversation {
  id: ID;
  type: 'direct' | 'group' | 'opportunity' | 'space';
  title: string;
  participantIds: ID[];
  opportunityId?: ID;
  spaceId?: ID;
  messages: { id: ID; authorId: ID; text: string; at: string }[];
}

export type NotificationKind =
  | 'review_requested'
  | 'review_completed'
  | 'task_assigned'
  | 'task_due'
  | 'message'
  | 'application'
  | 'check_in'
  | 'mention';

export interface AppNotification {
  id: ID;
  kind: NotificationKind;
  text: string;
  at: string;
  read: boolean;
  link?: string;
}

export type AccountStanding =
  | 'Good standing'
  | 'Verification incomplete'
  | 'Account under review'
  | 'Account restricted'
  | 'Account suspended for policy violations';

export interface Report {
  id: ID;
  targetType: 'user' | 'opportunity';
  targetId: ID;
  reason: string;
  status: 'Submitted' | 'Under review' | 'Resolved' | 'Dismissed';
  at: string;
}

export interface CollaborationReview {
  id: ID;
  spaceId: ID;
  ventureTitle: string;
  reviewerId: ID;
  revieweeId: ID;
  periodStart: string;
  periodEnd: string;
  text: string;
  at: string;
}

export type FraudSeverity = 'low' | 'medium' | 'high';
export type FraudAlertStatus = 'monitoring' | 'under_review' | 'resolved' | 'dismissed';

export interface FraudAlert {
  id: ID;
  type: string;
  severity: FraudSeverity;
  status: FraudAlertStatus;
  detectedAt: string;
  description: string;
}

export type TrustLayerStatus = 'verified' | 'pending' | 'unverified' | 'not_applicable';

export interface TrustLayerInfo {
  number: number;
  name: string;
  shortDescription: string;
  detail: string;
  userStatus: TrustLayerStatus;
  userDetail?: string;
}

export interface VerificationEvent {
  id: ID;
  label: string;
  type: VerificationClaim['type'];
  status: 'verified' | 'pending' | 'failed';
  at: string;
  detail?: string;
}

export interface TrustState {
  accountStanding: AccountStanding;
  reports: Report[];
  appealStatus?: string;
  safetyGuidanceRead: boolean;
  fraudAlerts: FraudAlert[];
  collaborationReviews: CollaborationReview[];
  trustLayers: TrustLayerInfo[];
  verificationTimeline: VerificationEvent[];
}

// Phase 2 — Professional Marketplace

export type ProfessionalCategory =
  | 'Attorney'
  | 'CPA'
  | 'Bookkeeper'
  | 'Marketing Agency'
  | 'Designer'
  | 'Developer'
  | 'Contractor'
  | 'Architect'
  | 'Engineer'
  | 'Insurance Professional'
  | 'Business Consultant'
  | 'HR Firm'
  | 'Payroll Provider'
  | 'Lender'
  | 'Grant Writer'
  | 'Financial Advisor'
  | 'Commercial Real Estate Agent'
  | 'Manufacturer'
  | 'Logistics Provider'
  | 'Other';

export type PricingModel = 'Hourly' | 'Project-based' | 'Retainer' | 'Equity' | 'Mixed' | 'Contact for quote';

export interface ProfessionalReview {
  id: ID;
  authorId: ID;
  authorName: string;
  rating: number;
  text: string;
  at: string;
  verified: boolean;
}

export interface Professional {
  id: ID;
  businessName: string;
  logoUrl: string;
  category: ProfessionalCategory;
  description: string;
  services: string[];
  industriesServed: Industry[];
  location: string;
  remote: boolean;
  portfolio: { id: ID; title: string; description: string; imageUrl: string }[];
  certifications: string[];
  website: string;
  yearsInBusiness: number;
  contactMethods: string[];
  responseTime: string;
  pricingModel: PricingModel;
  availability: 'Available' | 'Limited' | 'Unavailable';
  reviews: ProfessionalReview[];
  verified: boolean;
  premium: boolean;
  sponsored: boolean;
  ownerId: ID;
}

// Phase 2 — Company Pages

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface CompanyReview {
  id: ID;
  authorId: ID;
  authorName: string;
  rating: number;
  text: string;
  at: string;
}

export interface Company {
  id: ID;
  name: string;
  logoUrl: string;
  description: string;
  mission: string;
  services: string[];
  industries: Industry[];
  size: CompanySize;
  location: string;
  website: string;
  contactInfo: string;
  teamMemberIds: ID[];
  opportunityIds: ID[];
  portfolio: { id: ID; title: string; description: string }[];
  reviews: CompanyReview[];
  verified: boolean;
  ownerId: ID;
}

// Phase 2 — Builder Partners

export type PartnerCategory =
  | 'Banking'
  | 'Accounting'
  | 'Legal'
  | 'Insurance'
  | 'Payments'
  | 'Cloud Infrastructure'
  | 'Productivity'
  | 'CRM'
  | 'Marketing'
  | 'HR';

export interface BuilderPartner {
  id: ID;
  name: string;
  logoUrl: string;
  category: PartnerCategory;
  description: string;
  website: string;
  offer: string;
  educational: boolean;
}

// Phase 2 — Success Stories

export interface SuccessStory {
  id: ID;
  title: string;
  summary: string;
  teamFormed: string;
  opportunityDiscovered: string;
  ventureLaunched: string;
  businessGrowth: string;
  imageUrl: string;
  publishedAt: string;
  participantIds: ID[];
  industry: Industry;
}

// Phase 2 — Resource Center

export type ResourceCategory =
  | 'Finding Partners'
  | 'Starting Up'
  | 'Checklists'
  | 'Business Formation'
  | 'Real Estate Investing'
  | 'Grant Resources';

export interface ResourceArticle {
  id: ID;
  title: string;
  slug: string;
  category: ResourceCategory;
  excerpt: string;
  content: string;
  readTime: string;
  publishedAt: string;
  authorName: string;
}

// Phase 2 — Pricing

export type PlanTier = 'builder-free' | 'builder-pro' | 'professional' | 'company';

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PricingPlan {
  tier: PlanTier;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  highlighted: boolean;
}
