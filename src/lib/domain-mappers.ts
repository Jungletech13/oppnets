import type {
  CollaborationStyle,
  CollaborationSpace,
  Compensation,
  Industry,
  MissionDrive,
  Opportunity,
  OpportunityRole,
  OpportunityStage,
  Profile,
  Task,
  WorkStyle,
} from '@/types';

type Row = Record<string, unknown>;

export function mapProfileRow(row: Row): Profile {
  return {
    id: row.id as string,
    name: (row.name as string) || 'New builder',
    photoUrl: (row.photo_url as string) || '',
    location: (row.location as string) || '',
    headline: (row.headline as string) || '',
    bio: (row.bio as string) || '',
    skills: [],
    interests: (row.what_im_looking_for as string[]) || [],
    industries: [],
    availability: 'Available',
    timeCommitment: 'Part-time',
    opportunitiesSought: (row.what_im_looking_for as string[]) || [],
    buildingIds: [],
    ventureHistory: [],
    collaborationHistory: [],
    rolesHeld: [],
    endorsements: [],
    verifications: [],
    communityStanding: (row.community_standing as Profile['communityStanding']) || 'neutral',
  };
}

export function mapSpaceRow(row: Row): CollaborationSpace {
  const members = (row.space_members as Row[]) || [];
  const memberIds = members.map((member) => member.user_id as string);
  const roles = Object.fromEntries(members.map((member) => [member.user_id as string, (member.role as string) || 'Member']));
  return {
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    mission: (row.mission as string) || '',
    successDefinition: (row.success_definition as string) || '',
    memberIds,
    roles,
    tasks: ((row.tasks as Row[]) || []).map(mapTaskRow),
    milestones: ((row.milestones as Row[]) || []).map((milestone) => ({
      id: milestone.id as string,
      title: milestone.title as string,
      dueDate: (milestone.due_date as string) || '',
      done: (milestone.done as boolean) ?? false,
    })),
    files: ((row.space_files as Row[]) || []).map((file) => ({
      id: file.id as string,
      name: file.name as string,
      size: (file.size as string) || '',
      at: (file.uploaded_at as string) || '',
    })),
    notes: (row.notes as string) || '',
    decisions: ((row.decisions as Row[]) || []).map((decision) => ({
      id: decision.id as string,
      title: decision.title as string,
      decidedAt: (decision.decided_at as string) || '',
      by: (decision.decided_by as string) || '',
      rationale: (decision.rationale as string) || '',
    })),
    activity: ((row.activity_log as Row[]) || []).map((activity) => ({
      id: activity.id as string,
      at: (activity.at as string) || '',
      text: activity.text as string,
      actorId: activity.actor_id as string | undefined,
    })),
    modules: defaultSpaceModules,
    record: {
      projectName: row.name as string,
      opportunityCreatorId: memberIds[0] || '',
      ideaOrigin: 'Created from an opportunity listing.',
      beganAt: ((row.created_at as string) || '').slice(0, 10),
      participants: memberIds.map((profileId) => ({ profileId, role: roles[profileId], expectedContribution: '', responsibilities: '' })),
      goals: [],
      milestones: [],
      communicationExpectations: '',
      majorDecisions: [],
      acknowledgments: [],
    },
    checkIns: [],
    checkInFrequency: (row.check_in_frequency as CollaborationSpace['checkInFrequency']) || 'Weekly',
    nextCheckIn: (row.next_check_in as string) || '',
  };
}

function mapTaskRow(row: Row): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    ownerId: row.owner_id as string,
    reviewerId: (row.reviewer_id as string) || '',
    dueDate: (row.due_date as string) || '',
    priority: row.priority as Task['priority'],
    status: row.status as Task['status'],
    checklist: ((row.checklist_items as Row[]) || []).map((item) => ({
      id: item.id as string,
      text: item.label as string,
      done: (item.done as boolean) ?? false,
      submittedForReview: (item.submitted_for_review as boolean) ?? false,
    })),
    comments: (row.comments as Task['comments']) || [],
    revisions: (row.revisions as Task['revisions']) || [],
    feedback: (row.feedback as Task['feedback']) || undefined,
    dependencies: [],
  };
}

const defaultSpaceModules: CollaborationSpace['modules'] = [
  'team_chat',
  'tasks',
  'milestones',
  'decision_log',
  'collaboration_record',
  'notes',
  'files',
].map((kind, order) => ({ kind: kind as CollaborationSpace['modules'][number]['kind'], label: kind.replace(/_/g, ' '), pinned: order < 4, visible: true, order }));

export function profileToUpdate(profile: Profile) {
  return {
    name: profile.name,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    photo_url: profile.photoUrl,
    what_im_building: profile.buildingIds,
    what_im_looking_for: profile.opportunitiesSought,
  };
}

export function mapOpportunityRow(row: Row): Opportunity {
  const roles = ((row.opportunity_roles as Row[]) || []).map(mapOpportunityRoleRow);
  const category = row.category as Industry;
  const stage = row.stage as OpportunityStage;
  const timeCommitment = row.time_commitment as Opportunity['timeCommitment'];
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    category,
    stage,
    goals: (row.goals as string[]) || [],
    location: (row.location as string) || '',
    remote: (row.remote as boolean) ?? true,
    timeCommitment,
    roles,
    skillsNeeded: (row.skills_needed as string[]) || [],
    creatorBrings: (row.creator_brings as string) || '',
    compensation: row.compensation as Compensation,
    accepts: row.accepts as Opportunity['accepts'],
    startDate: (row.start_date as string) || '',
    visibility: row.visibility as Opportunity['visibility'],
    postedDate: (row.posted_date as string) || '',
    teamSize: (row.team_size as number) || 1,
    verified: (row.verified as boolean) ?? false,
    ownerId: row.owner_id as string,
    dna: {
      industry: category,
      stage,
      requiredSkills: (row.required_skills as string[]) || [],
      optionalSkills: (row.optional_skills as string[]) || [],
      timeCommitment,
      locationPreference: row.location_preference as Opportunity['dna']['locationPreference'],
      workStyle: row.work_style as WorkStyle,
      riskTolerance: row.risk_tolerance as Opportunity['dna']['riskTolerance'],
      leadershipNeeds: row.leadership_needs as Opportunity['dna']['leadershipNeeds'],
      collaborationStyle: row.collaboration_style as CollaborationStyle,
      missionDrive: row.mission_drive as MissionDrive,
      fundingStatus: row.funding_status as Opportunity['dna']['fundingStatus'],
    },
  };
}

function mapOpportunityRoleRow(row: Row): OpportunityRole {
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    skillsNeeded: (row.skills_needed as string[]) || [],
    openPositions: (row.open_positions as number) || 1,
    compensation: row.compensation as Compensation,
    filled: (row.filled as number) || 0,
  };
}

export function opportunityToInsert(opportunity: Opportunity) {
  return {
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    stage: opportunity.stage,
    goals: opportunity.goals,
    location: opportunity.location,
    remote: opportunity.remote,
    time_commitment: opportunity.timeCommitment,
    compensation: opportunity.compensation,
    accepts: opportunity.accepts,
    visibility: opportunity.visibility,
    start_date: opportunity.startDate || null,
    creator_brings: opportunity.creatorBrings,
    skills_needed: opportunity.skillsNeeded,
    required_skills: opportunity.dna.requiredSkills,
    optional_skills: opportunity.dna.optionalSkills,
    location_preference: opportunity.dna.locationPreference,
    work_style: opportunity.dna.workStyle,
    risk_tolerance: opportunity.dna.riskTolerance,
    leadership_needs: opportunity.dna.leadershipNeeds,
    collaboration_style: opportunity.dna.collaborationStyle,
    mission_drive: opportunity.dna.missionDrive,
    funding_status: opportunity.dna.fundingStatus,
  };
}
