import type {
  CollaborationStyle,
  Compensation,
  Industry,
  MissionDrive,
  Opportunity,
  OpportunityRole,
  OpportunityStage,
  Profile,
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
