import type { GuildUser, GuildRole, Need, Quest, Organization, NeedStatus, QuestStatus, QuestApplication } from '../types/guild';

// Role hierarchy for comparison (higher index = more powerful)
const ROLE_HIERARCHY: Record<GuildRole, number> = {
  applicant: 0,
  member: 1,
  contributor: 2,
  receptionistCandidate: 3,
  receptionist: 4,
  cityGuildMaster: 5,
  stateGuildMaster: 6,
  centralGuildMaster: 7,
  nationalGuildMaster: 8,
  guildFounder: 9,
  founder: 10,
  organizationRepresentative: 3, // Same as candidate level
  organization: 2 // Same as contributor level
};

// Check if user's role meets minimum required role
export function hasMinimumRole(user: GuildUser, requiredRole: GuildRole | GuildRole[]): boolean {
  const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
  const required = Array.isArray(requiredRole)
    ? Math.min(...requiredRole.map(r => ROLE_HIERARCHY[r] ?? 0))
    : ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= required;
}

// Check if user is at or above specific role level
export function isAtLeastRole(user: GuildRole, targetRole: GuildRole): boolean {
  return ROLE_HIERARCHY[user] >= ROLE_HIERARCHY[targetRole];
}

// Permission: VIEW actions
export function canViewQuest(user: GuildUser, quest: Quest): boolean {
  // Anyone can view open quests
  if (quest.status === 'open') return true;
  // Members can view their own quests
  if (quest.acceptedMembers?.includes(user.uid)) return true;
  // Applicants can view
  if (user.role === 'applicant') return false;
  return true;
}

export function canViewNeed(user: GuildUser, need: Need): boolean {
  // Organization can view their own needs
  if (need.organizationId) {
    // Check if user is org representative - would need org check
  }
  // Receptionist+ can view all
  if (['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return true;
}

export function canViewOrganization(user: GuildUser, org: Organization): boolean {
  // Owner can view
  if (org.ownerId === user.uid) return true;
  // Receptionist+ can view
  if (['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  // Members can view
  if (user.role !== 'applicant') return true;
  return true;
}

export function canViewSubmission(user: GuildUser, submission: QuestApplication): boolean {
  // Applicant can view own
  if (submission.applicantId === user.uid) return true;
  // Receptionist+ can view all
  if (['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return false;
}

// Permission: CREATE actions
export function canCreateQuest(user: GuildUser): boolean {
  return ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role);
}

export function canCreateNeed(user: GuildUser): boolean {
  return ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder', 'member', 'contributor'].includes(user.role);
}

export function canCreateOrganization(user: GuildUser): boolean {
  return user.role !== 'applicant';
}

export function canApplyForQuest(user: GuildUser, quest: Quest): boolean {
  // Can't apply if not member+
  if (!['member', 'contributor'].includes(user.role)) return false;
  // Can't apply if already assigned
  if (quest.acceptedMembers?.includes(user.uid)) return false;
  // Can't apply if already applied
  if (quest.applicants?.includes(user.uid)) return false;
  // Can't apply if quest not open
  if (quest.status !== 'open') return false;
  return true;
}

// Permission: EDIT actions
export function canEditQuest(user: GuildUser, quest: Quest): boolean {
  // Owner/receptionist can edit
  if (quest.assignedReceptionistId === user.uid) return true;
  // Admin can edit
  if (['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return false;
}

export function canEditNeed(user: GuildUser, need: Need): boolean {
  // Owner can edit
  if (need.assignedReceptionistId === user.uid) return true;
  // Admin can edit
  if (['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return false;
}

export function canEditOrganization(user: GuildUser, org: Organization): boolean {
  // Owner can edit
  if (org.ownerId === user.uid) return true;
  // Assigned receptionist can edit
  if (org.assignedReceptionistId === user.uid) return true;
  // Admin can edit
  if (['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return false;
}

// Permission: APPROVE actions
export function canApproveNeed(user: GuildUser, need: Need): boolean {
  // Assigned receptionist can approve
  if (need.assignedReceptionistId === user.uid) return true;
  // Admin can approve
  if (['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return false;
}

export function canApproveSubmission(user: GuildUser, application: QuestApplication): boolean {
  // Assigned receptionist can approve
  // Need quest receptionist check
  return ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role);
}

export function canVerifyOrganization(user: GuildUser, org: Organization): boolean {
  return ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role);
}

export function canReviewSubmission(user: GuildUser): boolean {
  return ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role);
}

// Permission: REJECT actions
export function canRejectNeed(user: GuildUser): boolean {
  return canApproveNeed(user, {} as Need);
}

export function canRejectSubmission(user: GuildUser): boolean {
  return canReviewSubmission(user);
}

// Permission: COMPLETE actions
export function canCompleteQuest(user: GuildUser, quest: Quest): boolean {
  // Assigned members can complete their work
  if (quest.acceptedMembers?.includes(user.uid)) return true;
  // Admin can mark complete
  if (['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role)) {
    return true;
  }
  return false;
}

// Permission: ARCHIVE actions
export function canArchiveQuest(user: GuildUser): boolean {
  return ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role);
}

export function canArchiveNeed(user: GuildUser): boolean {
  return canArchiveQuest(user);
}

export function canArchiveOrganization(user: GuildUser): boolean {
  return canArchiveQuest(user);
}

// Permission: REASSIGN actions
export function canReassignQuest(user: GuildUser): boolean {
  return ['cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder'].includes(user.role);
}

export function canReassignNeed(user: GuildUser): boolean {
  return canReassignQuest(user);
}

export function canReassignOrganization(user: GuildUser): boolean {
  return canReassignQuest(user);
}

// Utility: Get role display name
export function getRoleDisplayName(role: GuildRole): string {
  const names: Record<GuildRole, string> = {
    applicant: 'Applicant',
    member: 'Member',
    contributor: 'Contributor',
    receptionistCandidate: 'Receptionist Candidate',
    receptionist: 'Receptionist',
    cityGuildMaster: 'City Guild Master',
    stateGuildMaster: 'State Guild Master',
    centralGuildMaster: 'Central Guild Master',
    nationalGuildMaster: 'National Guild Master',
    guildFounder: 'Guild Founder',
    founder: 'Founder',
    organizationRepresentative: 'Organization Representative',
    organization: 'Organization'
  };
  return names[role] ?? role;
}