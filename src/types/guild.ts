export type GuildRole =
  | 'applicant'
  | 'member'
  | 'contributor'
  | 'receptionistCandidate'
  | 'receptionist'
  | 'cityGuildMaster'
  | 'stateGuildMaster'
  | 'centralGuildMaster'
  | 'nationalGuildMaster'
  | 'guildFounder'
  | 'founder'
  | 'organizationRepresentative'  // For converted organization accounts
  | 'organization';  // Alternative role for organization access

export type UserStatus = 
  | 'active' 
  | 'onLeave' 
  | 'inactive' 
  | 'suspended' 
  | 'resigned' 
  | 'removed' 
  | 'archived';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ArchiveStatus = 'active' | 'archived';
export type OrganizationStatus = 'new' | 'contacted' | 'active' | 'partner' | 'inactive' | 'verified' | 'trusted';
export type GuildRank = 'Applicant' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type OpportunityStatus = 'draft' | 'open' | 'matching' | 'assigned' | 'inProgress' | 'completed' | 'archived';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Jurisdiction {
  countryId: string;
  countryName: string;
  stateId: string;
  stateName: string;
  cityId: string;
  cityName: string;
  guildBranchId?: string;
  guildBranchName?: string;
}

export interface SuccessionPlan {
  primaryHolderId: string;
  backupHolderId?: string;
  emergencyHolderId?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditFields {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  responsibleReceptionist?: string;
  archiveStatus: ArchiveStatus;
  jurisdiction: Jurisdiction;
}

export interface ProofOfWork {
  id: string;
  title: string;
  description: string;
  link?: string;
  evidenceUrl?: string;
  skillsVerified: string[];
  createdAt: string;
  status: 'pending' | 'verified' | 'rejected';
  verifierNotes?: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
  questId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badgeCode: string; // e.g. 'first-quest', 'rep-100', 'builder-path'
  unlockedAt: string;
}

export interface PublicProfileSocialLinks {
  personalWebsite?: string;
  portfolioWebsite?: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  x?: string;
  youtube?: string;
  behance?: string;
  dribbble?: string;
  discord?: string;
  telegram?: string;
  medium?: string;
  blog?: string;
}

export interface PublicProfileVisibility {
  showBio?: boolean;
  showSocialLinks?: boolean;
  showPersonalWebsite?: boolean;
  showPortfolioWebsite?: boolean;
  showFeaturedSection?: boolean;
}

export interface PublicProfileSettings {
  bannerUrl?: string;
  headline?: string;
  shortBio?: string;
  professionalSummary?: string;
  profilePhotoUrl?: string;
  socialLinks?: PublicProfileSocialLinks;
  visibility?: PublicProfileVisibility;
  sectionOrder?: string[];
  featuredQuestId?: string;
  featuredOrganizationId?: string;
  featuredSkill?: string;
  contactPreference?: string;
}

export interface VerifiedSkillRecord {
  skill: string;
  sourceType: 'quest' | 'outcome' | 'knowledge' | 'organization' | 'guild';
  sourceId?: string;
  sourceTitle?: string;
  organizationId?: string;
  organizationName?: string;
  verifiedAt?: string;
  verifierId?: string;
}

export interface GuildUser extends AuditFields {
  uid: string;
  email: string;
  fullName: string;
  photoURL?: string;
  phone?: string;
  city?: string;
  role: GuildRole;
  status: UserStatus;
  contactInformation?: string;
  skills: string[];
  verifiedSkills?: string[];
  verifiedSkillRecords?: VerifiedSkillRecord[];
  interests: string[];
  bio?: string;
  verificationStatus: VerificationStatus;
  guildRank: GuildRank;
  reputationScore: number;
  experiencePoints: number;
  knowledgeEntriesCount: number;
  completedQuests: number;
  verifiedOutcomes: number;
  rankExamEligible?: boolean;
  rankExamEligibleAt?: string;
  rankExamTargetRank?: GuildRank | 'SS' | 'SSS';
  guildId?: string;
  adventurerId?: string;
  publicProfile?: PublicProfileSettings;
  revenueEarned: number;
  activityHistory: string[];
  successionPlan?: SuccessionPlan;
  recruitmentStep?: string;
  availability?: string;
  emergencyContact?: string;
  preferredRole?: string;
  referralSource?: string;
  lastActiveAt?: string;
  
  // Growth / Onboarding Wizard State
  pathSelected?: string;
  goals?: string[];
  skillsToLearn?: string[];
  onboardingStep?: number;
  onboardingCompleted?: boolean;

  // Portfolio & Proof System
  proofs?: ProofOfWork[];
  certificates?: Certificate[];
  achievements?: Achievement[];

  // Branch & Jurisdiction Assignment
  branchId?: string;
  branchName?: string;
}

export interface Organization extends AuditFields {
  id: string;
  name: string;
  searchName: string;
  category: 'Business' | 'NGO' | 'College' | 'School' | 'Community' | 'Government Related' | 'Individual Initiative';
  contactPerson: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  needs: string[];
  opportunities: string[];
  currentStatus: OrganizationStatus;
  ownerId?: string;
  trustLevel: 'new' | 'verified' | 'trusted' | 'partner';
  lastContactAt?: string;
  nextFollowUpAt?: string;
  relationshipNotes: string;
  
  // Receptionist matching
  assignedReceptionistId?: string;
  assignedReceptionistName?: string;

  // Branch assignment
  branchId?: string;
  branchName?: string;

  // Owner info for organization login
  ownerEmail?: string;

  // Verification
  verificationStatus?: 'pending' | 'verified' | 'rejected';

  // Visibility Controls
  visibility?: 'public' | 'guildMembers' | 'private' | 'draft';

  // Additional fields for display
  industry?: string;
  needsProcessed?: number;
  opportunitiesCreated?: number;
  questsCreated?: number;
  outcomesDelivered?: number;
  website?: string;
  socialLinks?: Record<string, string>;
  coverImage?: string;
  logo?: string;
}

export interface InteractionRecord {
  id: string;
  organizationId?: string;
  type: 'call' | 'meeting' | 'email' | 'visit' | 'note';
  summary: string;
  createdBy: string;
  createdAt: string;
  needId?: string;
  concern?: string;
  nextAction?: string;
  dueDate?: string;
}

export type NeedCategory = 'Technology' | 'Research' | 'Education' | 'Community' | 'Marketing' | 'Design' | 'Operations' | 'Other';
export type NeedStatus = 'submitted' | 'underReview' | 'accepted' | 'convertedToOpportunity' | 'questCreationInProgress' | 'inProgress' | 'completed' | 'closed';
export type BudgetRange = 'under5k' | '5k-25k' | '25k-100k' | '100k-500k' | '500k-plus' | 'volunteer' | 'toDiscuss';

export interface Need extends AuditFields {
  id: string;
  title: string;
  searchName: string;
  description: string;
  desiredOutcome?: string;
  category: NeedCategory;
  priority: Priority;
  budgetRange?: BudgetRange;
  timeline?: string;
  organizationId: string;
  organizationName?: string;
  location?: string;
  city?: string;
  deadline?: string;
  estimatedValue: number;
  status: NeedStatus;
  supportingDocuments?: string[];
  opportunityId?: string;
  questId?: string;
  assignedReceptionistId?: string;
  assignedReceptionistName?: string;
  lastUpdatedAt?: string;
  nextAction?: string;
  // Review fields for queue
  reviewNotes?: string;
  // Legacy fields for compatibility
  budget?: string;
  expectedOutcome?: string;
}

export interface Opportunity extends AuditFields {
  id: string;
  needId?: string;
  title: string;
  searchName: string;
  description: string;
  skillsRequired: string[];
  category: string;
  organizationId?: string;
  organizationName?: string;
  assignedMembers: string[];
  applicants: string[];
  assignedReceptionist: string;
  deadline?: string;
  estimatedRevenue: number;
  status: OpportunityStatus;
}

// Quest status - matches guild-auth workflowService
export type QuestStatus = 'draft' | 'open' | 'assigned' | 'inProgress' | 'underReview' | 'paymentPending' | 'completed' | 'closed' | 'cancelled' | 'archived';

// QUEST TYPES - Phase 2 Open Source Quest expansion
export type QuestType = 'standard' | 'openSource';
// Application status - 'completed' means member finished work on this quest (different from quest status)
export type QuestApplicationStatus = 'draft' | 'submitted' | 'underReview' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';

// Open Source Quest specific types
export interface OpenSourceTeamRole {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  openPositions: number;
  priority: Priority;
  teamLeadUserId?: string;
  applicationQuestions?: { question: string; required: boolean }[];
}

export interface QuestApplication extends AuditFields {
  id: string;
  questId: string;
  questTitle?: string;
  questType: QuestType;
  applicantId: string;
  applicantName?: string;
  roleId?: string;
  roleTitle?: string;
  motivation: string;
  experience: string;
  portfolioLinks?: string[];
  customAnswers?: Record<string, string>;
  status: QuestApplicationStatus;
  reviewerId?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface QuestParticipant extends AuditFields {
  id: string;
  questId: string;
  questType: QuestType;
  userId: string;
  userName?: string;
  roleId?: string;
  roleTitle?: string;
  status: 'active' | 'completed' | 'withdrawn';
  joinedAt: string;
  contributionLevel?: number;
  lastActiveAt?: string;
}

// Participation status - source of truth for user's quest involvement
export type ParticipationStatus = 'pending' | 'accepted' | 'active' | 'inProgress' | 'awaitingCompletionReview' | 'completed' | 'rejected' | 'withdrawn';

// Quest Participation - complete lifecycle record for accepted participants
export interface QuestParticipation extends AuditFields {
  id: string;
  questId: string;
  questTitle?: string;
  applicationId: string;
  questType: QuestType;
  userId: string;
  userName?: string;
  applicantId?: string;
  applicantName?: string;
  roleId?: string;
  roleTitle?: string;
  motivation?: string;
  // Status tracking
  status: ParticipationStatus;
  // Completion tracking
  completionStatus?: 'notStarted' | 'inProgress' | 'submitted' | 'approved' | 'rejected';
  reportStatus?: 'notStarted' | 'draft' | 'submitted' | 'approved' | 'needsRevision';
  // Dates
  acceptedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  // Report content
  report?: string;
  summary?: string;
  achievements?: string[];
  evidenceUrls?: string[];
  reviewerId?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  // Progress tracking
  contributionLevel?: number;
  lastActiveAt?: string;
  // Updated by for tracking who made last changes
  updatedBy?: string;
}

export interface QuestTeam {
  id: string;
  questId: string;
  name: string;
  announcements?: { id: string; title: string; content: string; createdAt: string; createdBy: string }[];
  resources?: { id: string; title: string; url: string; description?: string }[];
  milestones?: { id: string; title: string; status: 'pending' | 'inProgress' | 'completed'; dueDate?: string }[];
}

export interface QuestRelationship extends AuditFields {
  id: string;
  parentQuestId: string;
  childQuestId: string;
  relationshipType: 'milestone' | 'connected' | 'subquest';
  description?: string;
}

export type QuestClassification = 'Internal Guild' | 'External Client' | 'Community Service' | 'Revenue Generating' | 'Training' | 'Partnership' | 'Research' | 'Emergency';
export type VerificationLevel = 'Self Verified' | 'Receptionist Verified' | 'Manager Verified' | 'External Verified';

export interface QuestStakeholder {
  role: string;
  uid: string;
  name: string;
  joinedAt: string;
}

export interface Quest extends AuditFields {
  id: string;
  guildQuestId?: string;

  // Linkages
  opportunityId?: string;
  needId?: string;
  organizationId?: string;
  organizationName?: string;

  // QUEST TYPE - Phase 2 Open Source Quest expansion (backward compatible - default 'standard')
  questType?: QuestType;
  // Open Source Quest specific configuration
  openSourceConfig?: {
    mission?: string;
    goals?: string[];
    teamRoles?: OpenSourceTeamRole[];
    teamWorkspace?: QuestTeam;
    parentQuestId?: string;
    childQuestIds?: string[];
    // Social & Promotion
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      youtube?: string;
      website?: string;
      donationLink?: string;
    };
    // Fundraising
    fundraisingGoal?: number;
    fundraisingCurrency?: string;
    fundraisingTargetDate?: string;
    fundsRaised?: number;
    contributions?: {
      contributorId: string;
      contributorName: string;
      amount: number;
      message?: string;
      donatedAt: string;
    }[];
  };

  // Core Info
  title: string;
  description: string;
  category: string;
  classification?: QuestClassification;
  mode?: 'Remote' | 'Physical' | 'Hybrid';
  location?: { city?: string; state?: string; country?: string };

  // Requirements
  requiredRank?: GuildRank | 'Applicant';
  requiredSkills?: string[];
  knowledgeRequired?: boolean;
  estimatedHours?: number;
  priority?: Priority;
  questNature?: 'Volunteer' | 'Paid' | 'Internship' | 'Guild Duty' | 'Training' | 'Research' | 'Community Service' | 'Other';
  isMandatory: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';

  // Timeline
  deadline?: string;

  // Members & Application List
  applicants?: string[];
  membersRequired?: number;
  acceptedMembers?: string[];
  completedMembers?: string[];
  rejectedMembers?: string[];
  removedMembers?: string[];
  removalHistory?: { memberId: string; reason: string; removedAt: string; removedBy: string; memberName?: string }[];
  assignedReceptionistId?: string;
  assignedReceptionistName?: string;

  // Payments / Rewards
  isPaid?: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentType?: string;
  guildCommission?: number;
  guildRevenue?: number;
  memberPayout?: number;
  paymentStatus?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reputationPoints: number;
  experienceReward?: number;
  rewards: string;

  // Outcomes & Verification
  verificationMethod: VerificationMethod;
  expectedOutcome?: string;
  actualOutcome?: string;
  outcomeStatus?: 'Success' | 'Partial Success' | 'Failed';

  status: QuestStatus;
}

export type VerificationMethod = 'reportReview' | 'documentUpload' | 'receiptUpload' | 'organizationConfirmation' | 'manualReview';

export interface QuestSubmission extends AuditFields {
  id: string;
  questId: string;
  questTitle?: string;
  questType?: QuestType;
  memberId: string;
  memberName?: string;
  roleId?: string;
  roleTitle?: string;
  // Report content
  report?: string;
  summary?: string;
  achievements?: string[];
  outcomesProduced?: string[];
  // Attachments and links
  evidenceUrls: string[];
  links: string[];
  attachments?: { name: string; url: string; type: string }[];
  // Status
  status: SubmissionStatus;
  reviewerId?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface VerificationRecord extends AuditFields {
  id: string;
  targetCollection: LedgerCollection;
  targetId: string;
  method: VerificationMethod;
  evidence: string[];
  reviewer: string;
  decision: VerificationStatus;
  timestamp: string;
  notes?: string;
}

export interface Outcome extends AuditFields {
  id: string;
  title: string;
  description?: string;
  needId?: string;
  opportunityId?: string;
  questIds?: string[];
  participants: string[];
  organizationId?: string;
  organizationName?: string;
  evidence: string[];
  documents?: string[];
  knowledgeProduced?: string;
  revenueGenerated: number;
  verificationStatus: VerificationStatus;
  lessonsLearned?: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'archived';
}

export interface OrganizationActivity {
  id: string;
  organizationId: string;
  type: 'registered' | 'verificationCompleted' | 'needSubmitted' | 'needReviewed' | 'opportunityCreated' | 'questCreated' | 'outcomeDelivered' | 'followUpCompleted';
  title: string;
  description: string;
  createdAt: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export type RelationshipStatus = 'new' | 'verified' | 'active' | 'trusted' | 'partner';

export interface RevenueEvent extends AuditFields {
  id: string;
  source: string;
  questId?: string;
  opportunityId?: string;
  organizationId?: string;
  amount: number;
  date: string;
}

// ========== PAYMENT SYSTEM TYPES ==========

export type PaymentMethod = 'upi' | 'bankTransfer' | 'cash' | 'cheque' | 'card' | 'gateway' | 'other';
export type PaymentStatus = 'pending' | 'submitted' | 'underReview' | 'verified' | 'recorded' | 'rejected' | 'refunded';
export type PaymentType = 'membership' | 'donation' | 'sponsorship' | 'serviceFee' | 'eventFee' | 'certification' | 'other';

export interface UPIDetails {
  upiTransactionId?: string;
  utrNumber?: string;
  paymentApp?: 'phonepe' | 'googlePay' | 'paytm' | 'bhim' | 'paytm' | 'other';
}

export interface BankTransferDetails {
  transactionReference?: string;
  bankName?: string;
  transferDate?: string;
  accountNumber?: string;
}

export interface CashDetails {
  cashReceiptNumber?: string;
  collectedBy?: string;
  collectionDate?: string;
}

export interface ChequeDetails {
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
}

export interface PaymentRecord extends AuditFields {
  id: string;
  // Relationships
  revenueEventId?: string;
  payerId?: string;
  payerName?: string;
  payerOrganizationId?: string;
  receiverId?: string;
  receiverOrganizationId?: string;
  // Core fields
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  referenceNumber?: string;
  status: PaymentStatus;
  // Method-specific data (stored as JSON string in Firestore)
  upiDetails?: UPIDetails;
  bankTransferDetails?: BankTransferDetails;
  cashDetails?: CashDetails;
  chequeDetails?: ChequeDetails;
  // Verification
  submittedAt?: string;
  submittedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  // Receipt
  receiptId?: string;
  // Notes & Attachments
  notes?: string;
  attachments?: string[];
}

export type ReceiptType = 'digital' | 'manual' | 'cash' | 'donation' | 'membership' | 'service' | 'event';

export interface Receipt extends AuditFields {
  id: string;
  paymentId?: string;
  receiptNumber: string;
  receiptType: ReceiptType;
  // Recipient
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientOrganizationId?: string;
  // Amount
  amount: number;
  currency: string;
  // Related entities
  questId?: string;
  opportunityId?: string;
  organizationId?: string;
  memberId?: string;
  // Issue details
  issuedAt?: string;
  issuedBy?: string;
  // Status
  status: 'issued' | 'cancelled' | 'replaced';
  originalReceiptId?: string;
}

export interface FinancialAuditLog extends AuditFields {
  id: string;
  // Action type
  action: 'paymentCreated' | 'paymentSubmitted' | 'paymentVerified' | 'paymentRejected' | 'paymentRecorded' | 'receiptIssued' | 'receiptCancelled' | 'auditEntry';
  // User references
  userId?: string;
  userName?: string;
  // Organization
  organizationId?: string;
  organizationName?: string;
  // Branch/Jurisdiction
  jurisdictionId?: string;
  jurisdictionName?: string;
  // Payment reference
  paymentId?: string;
  receiptId?: string;
  // Details
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface OutstandingPayment extends AuditFields {
  id: string;
  paymentType: PaymentType;
  organizationId?: string;
  memberId?: string;
  amount: number;
  currency: string;
  dueDate?: string;
  status: 'pendingVerification' | 'pendingCollection' | 'outstanding' | 'overdue' | 'resolved';
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface KnowledgeRecord extends AuditFields {
  id: string;
  title: string;
  type: 'lesson' | 'successStory' | 'failureReport' | 'playbook' | 'template' | 'organizationInsight';
  authorId: string;
  questId?: string;
  opportunityId?: string;
  outcomeId?: string;
  organizationId?: string;
  tags: string[];
  lessonsLearned: string;
  whatWorked: string;
  whatFailed: string;
  advice: string;
  status: 'draft' | 'published';
}

export interface RankReviewTicket extends AuditFields {
  id: string;
  memberId: string;
  currentRank: GuildRank;
  requestedRank: GuildRank;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  time: string;
  actorId?: string;
  actorName?: string;
  targetUserId?: string;
  relatedEntityType?: LedgerCollection | 'auth' | 'system';
  entityType?: LedgerCollection | 'auth' | 'system';
  relatedEntityId?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type LedgerCollection =
  | 'users'
  | 'user'
  | 'organizations'
  | 'organization'
  | 'needs'
  | 'need'
  | 'opportunities'
  | 'opportunity'
  | 'quests'
  | 'quest'
  | 'questSubmissions'
  | 'outcomes'
  | 'verifications'
  | 'revenueEvents'
  | 'knowledgeBase'
  | 'notifications'
  | 'interactions'
  | 'rankReviews'
  | 'guildRegions'
  | 'guildStates'
  | 'guildCities'
  | 'successionPlans'
  | 'transferRecords'
  | 'leaveRecords'
  | 'escalationRecords'
  | 'disputeRecords'
  | 'payments'
  | 'receipts'
  | 'financialAuditLogs'
  | 'outstandingPayments';

export type NotificationType = 
  | "quest_assigned"
  | "quest_application"
  | "quest_accepted"
  | "quest_removed"
  | "quest_overdue"
  | "submission_verified"
  | "submission_rejected"
  | "submission_pending"
  | "opportunity_completed"
  | "revenue_recorded"
  | "application_submitted"
  | "application_approved"
  | "application_rejected"
  | "rank_promotion"
  | "role_assignment"
  | "verification_pending"
  | "organization_assigned"
  | "general_alert";

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'archived';

export interface NotificationRecord extends AuditFields {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  body: string;
  read: boolean;
  channel: 'inApp' | 'email' | 'whatsapp' | 'sms';
  actionUrl?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  hint?: string;
}

// Representative / Receptionist info for matching
export interface Receptionist {
  uid: string;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  photoURL?: string;
}

// ========== KNOWLEDGE BASE TYPES ==========
export type KnowledgeCategory = 'bestPractices' | 'templates' | 'successStories' | 'failureReports' | 'researchPapers' | 'campaignRecords' | 'reports' | 'other';

export interface KnowledgeArticle extends AuditFields {
  id: string;
  title: string;
  description: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  visibility: 'public' | 'guildMembers' | 'admins' | 'participants';
  authorId: string;
  authorName?: string;
  questId?: string;
  questTitle?: string;
  viewCount: number;
  downloadCount: number;
  status: 'draft' | 'published';
}

// ========== CONTRIBUTION HISTORY TYPES ==========
export interface ContributionHistory extends AuditFields {
  id: string;
  userId: string;
  // Quest contributions
  questsCompleted: number;
  questsInProgress: number;
  questsAsLead: number;
  questsAsTeamMember: number;
  // Open Source specific
  openSourceContributions: number;
  pullRequests: number;
  issuesResolved: number;
  // Fundraising
  fundsRaised: number;
  donationsReceived: number;
  campaignsSupported: number;
  // Reports
  reportsSubmitted: number;
  reportsApproved: number;
  // Team roles history
  teamRoles: { questId: string; role: string; questTitle: string; completedAt: string }[];
  // Impact metrics
  skillsGained: string[];
  totalHoursContributed: number;
  organizationsImpacted: number;
  lastUpdatedAt: string;
}
