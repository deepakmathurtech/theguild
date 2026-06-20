import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ActivityLog,
  AuditFields,
  GuildUser,
  KnowledgeRecord,
  LedgerCollection,
  Need,
  NeedCategory,
  BudgetRange,
  NotificationRecord,
  Opportunity,
  Organization,
  OrganizationActivity,
  Outcome,
  Quest,
  QuestSubmission,
  VerificationRecord,
  Receptionist
} from '../types/guild';

export function nowIso() {
  return new Date().toISOString();
}

export function auditFields(actor: GuildUser, responsibleReceptionist?: string): AuditFields {
  return {
    createdBy: actor.uid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    responsibleReceptionist: responsibleReceptionist || actor.uid,
    archiveStatus: 'active',
    jurisdiction: actor.jurisdiction
  };
}

export async function logActivity(input: Omit<ActivityLog, 'id' | 'time'>) {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      ...input,
      time: nowIso(),
      createdAtServer: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Receptionist directory for Relationship Matching
export const RECEPTIONISTS: Receptionist[] = [
  {
    uid: 'rec_amit',
    fullName: 'Amit Sharma',
    role: 'Growth Representative (Ludhiana)',
    email: 'amit.sharma@guild.org',
    phone: '+91 98765-43210',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
  },
  {
    uid: 'rec_priya',
    fullName: 'Priya Kaur',
    role: 'Community Builder (Punjab)',
    email: 'priya.kaur@guild.org',
    phone: '+91 98765-12345',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
  },
  {
    uid: 'rec_rahul',
    fullName: 'Rahul Verma',
    role: 'Corporate Success Manager (Delhi)',
    email: 'rahul.verma@guild.org',
    phone: '+91 98765-67890',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'
  }
];

export function getRandomReceptionist(): Receptionist {
  return RECEPTIONISTS[Math.floor(Math.random() * RECEPTIONISTS.length)];
}

// Ledger record CRUD
export async function createLedgerRecord<T extends DocumentData>(
  collectionName: LedgerCollection,
  data: Omit<T, 'id' | keyof AuditFields> & Partial<AuditFields>,
  actor: GuildUser,
  action: string
): Promise<T> {
  const ref = doc(collection(db, collectionName));
  const record = {
    ...data,
    ...auditFields(actor, data.responsibleReceptionist || actor.uid),
    id: ref.id,
    ownerId: (data as any).ownerId || actor.uid,
    createdAtServer: serverTimestamp()
  } as unknown as T;
  
  await setDoc(ref, record);
  await logActivity({
    userId: actor.uid,
    userName: actor.fullName,
    action,
    relatedEntityType: collectionName,
    relatedEntityId: ref.id
  });
  return record;
}

export async function updateLedgerRecord<T extends DocumentData>(
  collectionName: LedgerCollection,
  id: string,
  patch: Partial<T>,
  actor: GuildUser,
  action: string
) {
  const ref = doc(db, collectionName, id);
  await updateDoc(ref, {
    ...patch,
    updatedAt: nowIso(),
    updatedAtServer: serverTimestamp()
  } as DocumentData);

  await logActivity({
    userId: actor.uid,
    userName: actor.fullName,
    action,
    relatedEntityType: collectionName,
    relatedEntityId: id
  });
}

// Fetch all quests with pagination
export async function fetchQuests(filters?: {
  category?: string;
  difficulty?: string;
  mode?: string;
  status?: string;
  branchId?: string;
}, limitCount = 50): Promise<Quest[]> {
  const constraints: QueryConstraint[] = [where('archiveStatus', '==', 'active'), limit(limitCount)];
  
  if (filters?.category && filters.category !== 'All') {
    constraints.push(where('category', '==', filters.category));
  }
  if (filters?.difficulty && filters.difficulty !== 'All') {
    constraints.push(where('difficulty', '==', filters.difficulty));
  }
  if (filters?.mode && filters.mode !== 'All') {
    constraints.push(where('mode', '==', filters.mode));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters?.branchId) {
    constraints.push(where('jurisdiction.guildBranchId', '==', filters.branchId));
  }

  const q = query(collection(db, 'quests'), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest));
}

// Apply for a Quest
export async function applyForQuest(questId: string, user: GuildUser): Promise<void> {
  const questRef = doc(db, 'quests', questId);
  const snap = await getDoc(questRef);
  if (!snap.exists()) throw new Error('Quest not found');
  const quest = snap.data() as Quest;
  
  const applicants = quest.applicants || [];
  if (applicants.includes(user.uid)) return;

  await updateDoc(questRef, {
    applicants: [...applicants, user.uid],
    updatedAt: nowIso()
  });

  await logActivity({
    userId: user.uid,
    userName: user.fullName,
    action: `Applied for quest: ${quest.title}`,
    relatedEntityType: 'quests',
    relatedEntityId: questId
  });
}

// Submit Quest Submission (evidence of completion)
export async function submitQuestCompletion(
  questId: string, 
  user: GuildUser, 
  evidence: { report: string; links: string[]; evidenceUrls: string[] }
): Promise<QuestSubmission> {
  const questRef = doc(db, 'quests', questId);
  const snap = await getDoc(questRef);
  if (!snap.exists()) throw new Error('Quest not found');
  const quest = snap.data() as Quest;

  // Create submission record
  const submissionData: Omit<QuestSubmission, 'id' | keyof AuditFields> = {
    questId,
    questTitle: quest.title,
    memberId: user.uid,
    report: evidence.report,
    evidenceUrls: evidence.evidenceUrls,
    links: evidence.links,
    status: 'pending'
  };

  const submission = await createLedgerRecord<QuestSubmission>(
    'questSubmissions',
    submissionData,
    user,
    `Submitted proof of completion for quest: ${quest.title}`
  );

  // Update quest status
  await updateDoc(questRef, {
    status: 'underReview',
    updatedAt: nowIso()
  });

  return submission;
}

// Fetch user dashboard statistics
export async function fetchUserGrowthStats(userId: string) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as GuildUser;
}

// Fetch all Organizations
export async function fetchOrganizations(limitCount = 50): Promise<Organization[]> {
  const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
}

// Fetch organizations owned by user
export async function fetchUserOrganization(userId: string): Promise<Organization | null> {
  const q = query(collection(db, 'organizations'), where('ownerId', '==', userId), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Organization;
}

// Create a Need for an organization
export async function createNeed(
  organizationId: string,
  organizationName: string,
  data: {
    title: string;
    description: string;
    desiredOutcome?: string;
    category: NeedCategory;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    budgetRange?: BudgetRange;
    timeline?: string;
    deadline?: string;
    supportingDocuments?: string[];
  },
  actor: GuildUser
): Promise<Need> {
  const needData = {
    ...data,
    searchName: data.title.toLowerCase(),
    organizationId,
    organizationName,
    estimatedValue: 0,
    status: 'submitted' as const,
    lastUpdatedAt: nowIso(),
    nextAction: 'Under review by Guild Representative'
  };

  return createLedgerRecord<Need>('needs', needData as any, actor, `Submitted need: ${data.title}`);
}

// Fetch needs for an organization
export async function fetchOrganizationNeeds(organizationId: string): Promise<Need[]> {
  const q = query(collection(db, 'needs'), where('organizationId', '==', organizationId), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Need));
}

// Log organization activity
export async function logOrganizationActivity(
  organizationId: string,
  type: OrganizationActivity['type'],
  title: string,
  description: string,
  relatedEntityId?: string,
  relatedEntityType?: string
) {
  try {
    const ref = doc(collection(db, 'organizationActivities'));
    await setDoc(ref, {
      id: ref.id,
      organizationId,
      type,
      title,
      description,
      createdAt: nowIso(),
      relatedEntityId,
      relatedEntityType
    });
  } catch (error) {
    console.error('Failed to log organization activity:', error);
  }
}

// Fetch organization activities
export async function fetchOrganizationActivities(organizationId: string): Promise<OrganizationActivity[]> {
  const q = query(collection(db, 'organizationActivities'), where('organizationId', '==', organizationId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrganizationActivity)).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Fetch outcomes for an organization
export async function fetchOrganizationOutcomes(organizationId: string): Promise<Outcome[]> {
  const q = query(collection(db, 'outcomes'), where('organizationId', '==', organizationId), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outcome));
}

// Fetch all Outcomes
export async function fetchOutcomes(): Promise<Outcome[]> {
  const q = query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Outcome));
}

// Fetch all Knowledge Documents
export async function fetchKnowledgeBase(): Promise<KnowledgeRecord[]> {
  const q = query(collection(db, 'knowledgeBase'), where('archiveStatus', '==', 'active'), where('status', '==', 'published'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeRecord));
}

// Static Branch Profiles (Federation points)
export interface BranchProfileData {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  description: string;
  statistics: {
    activeMembers: number;
    completedQuests: number;
    verifiedOutcomesValue: string;
    trustScore: number;
  };
  localHubCoordinator: {
    name: string;
    photoURL?: string;
    role: string;
  };
  recruitmentStatus: string;
}

export const BRANCH_PROFILES: BranchProfileData[] = [
  {
    id: 'ludhiana-hq',
    name: 'The Guild - Ludhiana',
    city: 'Ludhiana',
    state: 'Punjab',
    country: 'India',
    description: 'The foundation branch in the heart of industrial Punjab. Spurring tech innovations, community services, and startup creation locally.',
    statistics: {
      activeMembers: 142,
      completedQuests: 384,
      verifiedOutcomesValue: '₹14,50,000',
      trustScore: 98
    },
    localHubCoordinator: {
      name: 'Amit Sharma',
      role: 'City Guild Master',
      photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
    },
    recruitmentStatus: 'Open for Tech & Biotech cohorts'
  },
  {
    id: 'punjab-state',
    name: 'The Guild - Punjab',
    city: 'Chandigarh',
    state: 'Punjab',
    country: 'India',
    description: 'State coordination hub governing district chapters. Focusing on large-scale agricultural technology projects and sustainable rural development models.',
    statistics: {
      activeMembers: 490,
      completedQuests: 1200,
      verifiedOutcomesValue: '₹55,00,000',
      trustScore: 95
    },
    localHubCoordinator: {
      name: 'Priya Kaur',
      role: 'State Guild Representative',
      photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
    },
    recruitmentStatus: 'Recruiting Guild Masters for new city branches'
  },
  {
    id: 'delhi-hq',
    name: 'The Guild - Delhi NCR',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    description: 'Capital hub managing policy audits, corporate partnerships, and non-governmental operational assistance projects.',
    statistics: {
      activeMembers: 320,
      completedQuests: 750,
      verifiedOutcomesValue: '₹38,00,000',
      trustScore: 97
    },
    localHubCoordinator: {
      name: 'Rahul Verma',
      role: 'Regional Operations Lead',
      photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'
    },
    recruitmentStatus: 'Open for NGO campaign assistants & developers'
  }
];

// Branch/Chapter CRUD - Firestore with fallback to static data
export async function fetchBranches(): Promise<BranchProfileData[]> {
  try {
    const q = query(collection(db, 'branches'), where('status', '==', 'active'), orderBy('name'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return BRANCH_PROFILES; // Fallback to static data
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BranchProfileData));
  } catch (e) {
    console.warn('Failed to fetch branches from Firestore, using static data:', e);
    return BRANCH_PROFILES; // Fallback to static data on error
  }
}

export async function fetchBranchById(id: string): Promise<BranchProfileData | null> {
  try {
    const ref = doc(db, 'branches', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as BranchProfileData;
    }
    return getBranchById(id) || null; // Check static fallback
  } catch {
    return getBranchById(id) || null;
  }
}

export function getBranchById(id: string): BranchProfileData | undefined {
  return BRANCH_PROFILES.find(b => b.id === id);
}

// Notification CRUD
export async function fetchUserNotifications(userId: string, limitCount = 50): Promise<NotificationRecord[]> {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as NotificationRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('status', '==', 'unread')
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { status: 'read', updatedAt: nowIso() });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('status', '==', 'unread')
  );
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map(doc =>
    updateDoc(doc.ref, { status: 'read', updatedAt: nowIso() })
  );
  await Promise.all(updates);
}

export async function dismissNotification(notificationId: string): Promise<void> {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { status: 'dismissed', updatedAt: nowIso() });
}

export async function archiveNotification(notificationId: string): Promise<void> {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { status: 'archived', updatedAt: nowIso() });
}

// ===========================================
// OPERATIONAL MANAGEMENT FUNCTIONS
// ===========================================

// ---- User Management ----
export async function fetchUsers(filters?: {
  role?: string;
  status?: string;
  jurisdiction?: string;
}, limitCount = 50): Promise<GuildUser[]> {
  const constraints: QueryConstraint[] = [where('archiveStatus', '==', 'active'), limit(limitCount)];

  if (filters?.role) {
    constraints.push(where('role', '==', filters.role));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  try {
    const q = query(collection(db, 'users'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as GuildUser));
  } catch (e) {
    // Fallback: if query fails (e.g., missing index), fetch all and filter locally
    const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'));
    const snapshot = await getDocs(q);
    let users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as GuildUser));

    if (filters?.status) {
      users = users.filter(u => u.status === filters.status);
    }
    if (filters?.jurisdiction) {
      users = users.filter(u => u.jurisdiction?.cityName === filters.jurisdiction);
    }
    return users;
  }
}

export async function fetchUserById(userId: string): Promise<GuildUser | null> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as GuildUser) : null;
}

export async function updateUserProfile(userId: string, updates: Partial<GuildUser>, actor: GuildUser): Promise<void> {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: nowIso(),
    lastUpdatedBy: actor.uid
  });

  // Log activity
  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'user_updated',
    entityType: 'user',
    entityId: userId,
    details: { updates: Object.keys(updates) }
  });
}

export async function verifyUser(userId: string, actor: GuildUser, notes?: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    verificationStatus: 'verified',
    verifiedAt: nowIso(),
    verifiedBy: actor.uid,
    verificationNotes: notes || '',
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'user_verified',
    entityType: 'user',
    entityId: userId,
    details: { notes }
  });
}

export async function assignQuestToUser(questId: string, userId: string, actor: GuildUser, notes?: string): Promise<void> {
  const ref = doc(db, 'quests', questId);
  await updateDoc(ref, {
    assignedTo: userId,
    status: 'assigned',
    assignedAt: nowIso(),
    assignedBy: actor.uid,
    assignmentNotes: notes || '',
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'quest_assigned',
    entityType: 'quest',
    entityId: questId,
    targetUserId: userId,
    details: { notes }
  });
}

export async function removeQuestAssignment(questId: string, actor: GuildUser): Promise<void> {
  const ref = doc(db, 'quests', questId);
  await updateDoc(ref, {
    assignedTo: null,
    status: 'open',
    removedAt: nowIso(),
    removedBy: actor.uid,
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'assignment_removed',
    entityType: 'quest',
    entityId: questId
  });
}

export async function promoteUser(userId: string, newRole: string, actor: GuildUser, notes?: string): Promise<void> {
  const validRoles = ['applicant', 'member', 'contributor', 'receptionist', 'cityGuildMaster', 'founder'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role');
  }

  await updateDoc(doc(db, 'users', userId), {
    role: newRole,
    promotedAt: nowIso(),
    promotedBy: actor.uid,
    promotionNotes: notes || '',
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'user_promoted',
    entityType: 'user',
    entityId: userId,
    details: { newRole, notes }
  });
}

export async function demoteUser(userId: string, newRole: string, actor: GuildUser, notes?: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    role: newRole,
    demotedAt: nowIso(),
    demotedBy: actor.uid,
    demotionNotes: notes || '',
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'user_demoted',
    entityType: 'user',
    entityId: userId,
    details: { newRole, notes }
  });
}

// ---- Organization Management ----
export async function fetchAllOrganizations(filters?: {
  status?: string;
}): Promise<Organization[]> {
  const constraints: QueryConstraint[] = [where('archiveStatus', '==', 'active')];

  if (filters?.status) {
    constraints.push(where('verificationStatus', '==', filters.status));
  }

  try {
    const q = query(collection(db, 'organizations'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
  } catch (e) {
    // Fallback
    const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
    const snapshot = await getDocs(q);
    let orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
    if (filters?.status) {
      orgs = orgs.filter(o => o.verificationStatus === filters.status);
    }
    return orgs;
  }
}

export async function verifyOrganization(orgId: string, actor: GuildUser, notes?: string): Promise<void> {
  await updateDoc(doc(db, 'organizations', orgId), {
    verificationStatus: 'verified',
    verifiedAt: nowIso(),
    verifiedBy: actor.uid,
    verificationNotes: notes || '',
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'organization_verified',
    entityType: 'organization',
    entityId: orgId,
    details: { notes }
  });
}

export async function assignReceptionistToOrg(orgId: string, receptionistId: string, actor: GuildUser): Promise<void> {
  await updateDoc(doc(db, 'organizations', orgId), {
    assignedReceptionist: receptionistId,
    assignedAt: nowIso(),
    assignedBy: actor.uid,
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'receptionist_assigned',
    entityType: 'organization',
    entityId: orgId,
    targetUserId: receptionistId
  });
}

export async function updateOrganizationStatus(orgId: string, status: string, actor: GuildUser): Promise<void> {
  await updateDoc(doc(db, 'organizations', orgId), {
    status,
    updatedAt: nowIso(),
    lastUpdatedBy: actor.uid
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'organization_status_updated',
    entityType: 'organization',
    entityId: orgId,
    details: { status }
  });
}

// ---- Need Pipeline Management ----
export async function approveNeed(needId: string, actor: GuildUser, notes?: string): Promise<void> {
  await updateDoc(doc(db, 'needs', needId), {
    status: 'underReview',
    reviewedAt: nowIso(),
    reviewedBy: actor.uid,
    reviewNotes: notes || '',
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'need_approved',
    entityType: 'need',
    entityId: needId,
    details: { notes }
  });
}

export async function rejectNeed(needId: string, actor: GuildUser, notes: string): Promise<void> {
  await updateDoc(doc(db, 'needs', needId), {
    status: 'rejected',
    rejectedAt: nowIso(),
    rejectedBy: actor.uid,
    rejectionNotes: notes,
    updatedAt: nowIso()
  });

  await logActivity({
    actorId: actor.uid,
    actorName: actor.fullName,
    action: 'need_rejected',
    entityType: 'need',
    entityId: needId,
    details: { notes }
  });
}

// ---- Branch/Chapter Management ----
export async function fetchBranchStats(branchId: string): Promise<{
  totalMembers: number;
  activeQuests: number;
  completedQuests: number;
  pendingNeeds: number;
  activeOpportunities: number;
  totalOrganizations: number;
}> {
  try {
    // Get member count
    const memberQ = query(collection(db, 'users'),
      where('archiveStatus', '==', 'active'));
    const memberSnap = await getDocs(memberQ);
    const members = memberSnap.docs.map(d => d.data() as GuildUser);

    // Get quest counts
    const questQ = query(collection(db, 'quests'), where('archiveStatus', '==', 'active'));
    const questSnap = await getDocs(questQ);
    const quests = questSnap.docs.map(d => d.data() as Quest);

    // Get need counts
    const needQ = query(collection(db, 'needs'), where('archiveStatus', '==', 'active'));
    const needSnap = await getDocs(needQ);
    const needs = needSnap.docs.map(d => d.data() as Need);

    // Get org counts
    const orgQ = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
    const orgSnap = await getDocs(orgQ);
    const orgs = orgSnap.docs.map(d => d.data() as Organization);

    return {
      totalMembers: members.length,
      activeQuests: quests.filter(q => q.status === 'inProgress' || q.status === 'assigned').length,
      completedQuests: quests.filter(q => q.status === 'completed').length,
      pendingNeeds: needs.filter(n => n.status === 'submitted' || n.status === 'underReview').length,
      activeOpportunities: needs.filter(n => n.status === 'convertedToOpportunity').length,
      totalOrganizations: orgs.length
    };
  } catch (e) {
    console.error('Failed to fetch branch stats:', e);
    return {
      totalMembers: 0,
      activeQuests: 0,
      completedQuests: 0,
      pendingNeeds: 0,
      activeOpportunities: 0,
      totalOrganizations: 0
    };
  }
}

export async function fetchFederationStats(): Promise<{
  totalMembers: number;
  totalReceptionists: number;
  totalGuildMasters: number;
  totalOrganizations: number;
  activeQuests: number;
  pendingNeeds: number;
  completedOutcomes: number;
}> {
  try {
    const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'));
    const snap = await getDocs(q);
    const users = snap.docs.map(d => d.data() as GuildUser);

    const questQ = query(collection(db, 'quests'), where('archiveStatus', '==', 'active'));
    const questSnap = await getDocs(questQ);
    const quests = questSnap.docs.map(d => d.data() as Quest);

    const needQ = query(collection(db, 'needs'), where('archiveStatus', '==', 'active'));
    const needSnap = await getDocs(needQ);
    const needs = needSnap.docs.map(d => d.data() as Need);

    const orgQ = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
    const orgSnap = await getDocs(orgQ);

    return {
      totalMembers: users.length,
      totalReceptionists: users.filter(u => u.role === 'receptionist').length,
      totalGuildMasters: users.filter(u => u.role === 'cityGuildMaster').length,
      totalOrganizations: orgSnap.size,
      activeQuests: quests.filter(q => q.status === 'inProgress' || q.status === 'assigned').length,
      pendingNeeds: needs.filter(n => n.status === 'submitted').length,
      completedOutcomes: quests.filter(q => q.status === 'completed').length
    };
  } catch (e) {
    console.error('Failed to fetch federation stats:', e);
    return {
      totalMembers: 0,
      totalReceptionists: 0,
      totalGuildMasters: 0,
      totalOrganizations: 0,
      activeQuests: 0,
      pendingNeeds: 0,
      completedOutcomes: 0
    };
  }
}

// ---- Activity Timeline ----
export async function fetchEntityTimeline(entityType: string, entityId: string, limit = 20): Promise<ActivityLog[]> {
  const q = query(
    collection(db, 'activityLogs'),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId),
    orderBy('time', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
}

// ---- Conflict Prevention (Locking) ----
export async function acquireLock(entityType: string, entityId: string, userId: string): Promise<boolean> {
  const lockRef = doc(db, 'locks', `${entityType}_${entityId}`);
  const lockSnap = await getDoc(lockRef);

  if (lockSnap.exists()) {
    const lock = lockSnap.data();
    if (lock.expiresAt && new Date(lock.expiresAt) < new Date()) {
      // Lock expired, can acquire
      await setDoc(lockRef, {
        entityType,
        entityId,
        lockedBy: userId,
        lockedAt: nowIso(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min lock
      });
      return true;
    }
    if (lock.lockedBy === userId) {
      // Already locked by same user, extend
      await updateDoc(lockRef, {
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });
      return true;
    }
    return false; // Locked by someone else
  }

  // No lock exists, create one
  await setDoc(lockRef, {
    entityType,
    entityId,
    lockedBy: userId,
    lockedAt: nowIso(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  });
  return true;
}

export async function releaseLock(entityType: string, entityId: string, userId: string): Promise<void> {
  const lockRef = doc(db, 'locks', `${entityType}_${entityId}`);
  const lockSnap = await getDoc(lockRef);

  if (lockSnap.exists() && lockSnap.data().lockedBy === userId) {
    await deleteDoc(lockRef);
  }
}

// Opportunity CRUD
export async function fetchOpportunities(filters?: {
  organizationId?: string;
  status?: string;
}): Promise<Opportunity[]> {
  const constraints: QueryConstraint[] = [where('archiveStatus', '==', 'active')];

  if (filters?.organizationId) {
    constraints.push(where('organizationId', '==', filters.organizationId));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const q = query(collection(db, 'opportunities'), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opportunity));
}

// Convert Need to Opportunity (for receptionists/admins)
export async function convertNeedToOpportunity(
  needId: string,
  opportunityData: {
    title: string;
    description: string;
    skillsRequired?: string[];
    category?: string;
    deadline?: string;
    estimatedRevenue?: number;
  },
  actor: GuildUser
): Promise<Opportunity> {
  const needRef = doc(db, 'needs', needId);
  const needSnap = await getDoc(needRef);
  if (!needSnap.exists()) throw new Error('Need not found');

  const need = needSnap.data() as Need;

  // Create opportunity
  const opp = await createLedgerRecord<Opportunity>('opportunities', {
    ...opportunityData,
    category: opportunityData.category || 'operator',
    skillsRequired: opportunityData.skillsRequired || [],
    searchName: opportunityData.title.toLowerCase(),
    needId,
    organizationId: need.organizationId,
    organizationName: need.organizationName,
    assignedMembers: [],
    applicants: [],
    assignedReceptionist: actor.uid,
    estimatedRevenue: opportunityData.estimatedRevenue || 0,
    status: 'open'
  }, actor, `Converted need to opportunity: ${need.title}`);

  // Update need status
  await updateDoc(needRef, {
    status: 'convertedToOpportunity',
    opportunityId: opp.id,
    updatedAt: nowIso()
  });

  return opp;
}

// Spawn Quest from Opportunity (for receptionists/admins)
export async function spawnQuestForOpportunity(
  opportunityId: string,
  questData: {
    title: string;
    description: string;
    category?: string;
    difficulty?: string;
    mode?: string;
    reputationPoints?: number;
    paymentAmount?: number;
    isPaid?: boolean;
    paymentType?: string;
    estimatedHours?: number;
    requiredRank?: string;
    verificationMethod?: 'reportReview' | 'documentUpload' | 'receiptUpload' | 'organizationConfirmation' | 'manualReview';
  },
  actor: GuildUser
): Promise<Quest> {
  const oppRef = doc(db, 'opportunities', opportunityId);
  const oppSnap = await getDoc(oppRef);
  if (!oppSnap.exists()) throw new Error('Opportunity not found');

  const opportunity = oppSnap.data() as Opportunity;

  // Generate quest ID
  const cityPrefix = actor.jurisdiction?.cityId?.slice(0, 3).toUpperCase() || 'GEN';
  const statePrefix = actor.jurisdiction?.stateId?.slice(0, 2).toUpperCase() || 'XX';
  const categoryPrefix = (questData.category || 'GEN').slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4);
  const questId = `QUEST-${cityPrefix}-${statePrefix}-${categoryPrefix}-${timestamp}`;

  const quest = await createLedgerRecord<Quest>('quests', {
    title: questData.title,
    description: questData.description,
    category: questData.category || 'operator',
    difficulty: questData.difficulty as Quest['difficulty'] || 'medium',
    mode: (questData.mode as Quest['mode']) || 'Remote',
    reputationPoints: 0,
    verificationMethod: questData.verificationMethod || 'manualReview',
    opportunityId,
    needId: opportunity.needId,
    organizationId: opportunity.organizationId,
    organizationName: opportunity.organizationName,
    isMandatory: false,
    rewards: '',
    status: 'open'
  }, actor, `Created quest from opportunity: ${opportunity.title}`);

  // Update opportunity status
  await updateDoc(oppRef, {
    status: 'questCreated',
    questId: quest.id,
    updatedAt: nowIso()
  });

  return quest;
}

// Quest Submissions CRUD
export async function fetchQuestSubmissions(filters?: {
  questId?: string;
  memberId?: string;
  status?: string;
}): Promise<QuestSubmission[]> {
  const constraints: QueryConstraint[] = [];

  if (filters?.questId) {
    constraints.push(where('questId', '==', filters.questId));
  }
  if (filters?.memberId) {
    constraints.push(where('memberId', '==', filters.memberId));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  if (constraints.length === 0) {
    constraints.push(where('archiveStatus', '==', 'active'));
  }

  const q = query(collection(db, 'questSubmissions'), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestSubmission));
}

// Approve Submission (for receptionists/admins)
export async function approveSubmission(
  submissionId: string,
  actor: GuildUser,
  notes?: string
): Promise<void> {
  const ref = doc(db, 'questSubmissions', submissionId);
  await updateDoc(ref, {
    status: 'approved',
    reviewerId: actor.uid,
    reviewerNotes: notes || '',
    reviewedAt: nowIso(),
    updatedAt: nowIso()
  });

  // Log activity
  await logActivity({
    userId: actor.uid,
    userName: actor.fullName,
    action: `Approved quest submission: ${submissionId}`,
    relatedEntityType: 'questSubmissions',
    relatedEntityId: submissionId
  });
}

// Reject Submission (for receptionists/admins)
export async function rejectSubmission(
  submissionId: string,
  actor: GuildUser,
  notes?: string
): Promise<void> {
  const ref = doc(db, 'questSubmissions', submissionId);
  await updateDoc(ref, {
    status: 'rejected',
    reviewerId: actor.uid,
    reviewerNotes: notes || '',
    reviewedAt: nowIso(),
    updatedAt: nowIso()
  });

  // Log activity
  await logActivity({
    userId: actor.uid,
    userName: actor.fullName,
    action: `Rejected quest submission: ${submissionId}`,
    relatedEntityType: 'questSubmissions',
    relatedEntityId: submissionId
  });
}
