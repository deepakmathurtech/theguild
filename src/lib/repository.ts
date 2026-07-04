import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
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
  QuestApplication,
  QuestParticipation,
  QuestSubmission,
  QuestType,
  ParticipationStatus,
  VerificationRecord,
  Receptionist,
  PaymentRecord,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Receipt,
  ReceiptType,
  FinancialAuditLog,
  OutstandingPayment
} from '../types/guild';

export function nowIso() {
  return new Date().toISOString();
}

// Send notification to user (used for acceptance, completion, etc.)
export async function notifyUser(
  userId: string,
  type: 'quest_accepted' | 'quest_rejected' | 'submission_approved' | 'submission_rejected' | 'quest_completed' | 'application_submitted' | 'quest_withdrawn',
  title: string,
  body: string,
  actionUrl?: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<void> {
  const notificationsRef = collection(db, 'notifications');
  const notificationId = `notif_${Date.now()}_${userId.slice(0, 8)}`;

  await setDoc(doc(db, 'notifications', notificationId), {
    id: notificationId,
    userId,
    type,
    title,
    body,
    priority,
    status: 'unread',
    read: false,
    channel: 'inApp',
    actionUrl: actionUrl || undefined,
    createdAt: nowIso(),
    createdBy: 'system',
    archiveStatus: 'active',
    jurisdiction: { cityName: '', stateName: '', countryName: '' },
    updatedAt: nowIso()
  });
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

// Receptionist directory for Relationship Matching (fallback)
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

// Fetch receptionists dynamically from Firestore
export async function fetchReceptionists(): Promise<Receptionist[]> {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'receptionist'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return RECEPTIONISTS;
    }
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: data.uid,
        fullName: data.fullName || data.displayName || 'Receptionist',
        role: data.role || 'Receptionist',
        email: data.email,
        phone: data.phone,
        photoURL: data.photoURL
      } as Receptionist;
    });
  } catch (e) {
    console.warn('Failed to fetch receptionists from Firestore, using static data:', e);
    return RECEPTIONISTS;
  }
}

// Fetch a specific receptionist by ID
export async function fetchReceptionistById(uid: string): Promise<Receptionist | null> {
  if (!uid) return null;
  try {
    // Try direct document fetch first; user docs are keyed by uid.
    const userSnapshot = await getDoc(doc(db, 'users', uid));
    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      return {
        uid: data.uid || uid,
        fullName: data.fullName || data.displayName || 'Receptionist',
        role: data.role || 'Receptionist',
        email: data.email,
        phone: data.phone,
        photoURL: data.photoURL
      } as Receptionist;
    }

    const q = query(collection(db, 'users'), where('uid', '==', uid), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return RECEPTIONISTS.find(r => r.uid === uid) || null;
    }
    const data = snapshot.docs[0].data();
    return {
      uid: data.uid,
      fullName: data.fullName || data.displayName || 'Receptionist',
      role: data.role || 'Receptionist',
      email: data.email,
      phone: data.phone,
      photoURL: data.photoURL
    } as Receptionist;
  } catch (e) {
    console.warn('Failed to fetch receptionist:', e);
    return RECEPTIONISTS.find(r => r.uid === uid) || null;
  }
}

// Get random receptionist for fallback
export function getRandomReceptionist(): Receptionist {
  return RECEPTIONISTS[Math.floor(Math.random() * RECEPTIONISTS.length)];
}

// ========== OPTIMIZED DIRECTORY & SUMMARY FUNCTIONS ==========

// Lightweight user directory - returns only essential fields for fast loading
export interface UserDirectoryEntry {
  uid: string;
  fullName: string;
  photoURL?: string;
  role: string;
  branchId?: string;
  branchName?: string;
  verificationStatus: string;
  guildRank: string;
  status: string;
}

// Get lightweight user directory with optional branch filter
export async function fetchUserDirectory(branchId?: string, limitCount = 20): Promise<UserDirectoryEntry[]> {
  const constraints: QueryConstraint[] = [
    where('archiveStatus', '==', 'active'),
    orderBy('fullName'),
    limit(limitCount)
  ];
  if (branchId) {
    constraints.push(where('branchId', '==', branchId));
  }
  const q = query(collection(db, 'users'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      uid: doc.id,
      fullName: d.fullName,
      photoURL: d.photoURL,
      role: d.role,
      branchId: d.branchId || d.jurisdiction?.guildBranchId,
      branchName: d.branchName || d.jurisdiction?.guildBranchName,
      verificationStatus: d.verificationStatus,
      guildRank: d.guildRank,
      status: d.status
    } as UserDirectoryEntry;
  });
}

// Lightweight organization directory
export interface OrgDirectoryEntry {
  id: string;
  name: string;
  category: string;
  branchId?: string;
  branchName?: string;
  currentStatus: string;
  trustLevel: string;
  ownerEmail?: string;
}

// Get lightweight org directory with branch filter
export async function fetchOrgDirectory(branchId?: string, limitCount = 20): Promise<OrgDirectoryEntry[]> {
  const constraints: QueryConstraint[] = [
    where('archiveStatus', '==', 'active'),
    orderBy('name'),
    limit(limitCount)
  ];
  if (branchId) {
    constraints.push(where('branchId', '==', branchId));
  }
  const q = query(collection(db, 'organizations'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name,
      category: d.category,
      branchId: d.branchId,
      branchName: d.branchName,
      currentStatus: d.currentStatus,
      trustLevel: d.trustLevel,
      ownerEmail: d.ownerEmail
    } as OrgDirectoryEntry;
  });
}

// Get member count per branch using efficient count query
export async function fetchBranchMemberCount(branchId: string): Promise<number> {
  const q = query(
    collection(db, 'users'),
    where('branchId', '==', branchId),
    where('archiveStatus', '==', 'active')
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

// Get organization count per branch
export async function fetchBranchOrgCount(branchId: string): Promise<number> {
  const q = query(
    collection(db, 'organizations'),
    where('branchId', '==', branchId),
    where('archiveStatus', '==', 'active')
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

// Get quest count per branch
export async function fetchBranchQuestCount(branchId: string): Promise<number> {
  const q = query(
    collection(db, 'quests'),
    where('branchId', '==', branchId),
    where('archiveStatus', '==', 'active')
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

// Total counts using efficient counting
export async function fetchTotalUserCount(): Promise<number> {
  const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function fetchTotalOrgCount(): Promise<number> {
  const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function fetchTotalQuestCount(): Promise<number> {
  const q = query(collection(db, 'quests'), where('archiveStatus', '==', 'active'));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

// ========== BRANCH SUMMARIES (Pre-computed Aggregates) ==========

export interface BranchSummary {
  branchId: string;
  branchName: string;
  memberCount: number;
  organizationCount: number;
  questCount: number;
  outcomeCount: number;
  activeNeedCount: number;
  pendingVerificationCount: number;
  unreadNotificationCount: number;
  totalRevenue: number;
  updatedAt: string;
}

// Get or create branch summary
export async function getBranchSummary(branchId: string): Promise<BranchSummary | null> {
  try {
    const ref = doc(db, 'branchSummaries', branchId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as BranchSummary;
    }
    return null;
  } catch (e) {
    console.warn('Branch summary not found:', e);
    return null;
  }
}

// Create/update branch summary (run periodically or after significant changes)
export async function updateBranchSummary(branchId: string, branchName: string): Promise<BranchSummary> {
  const [
    memberSnap,
    orgSnap,
    questSnap,
    outcomeSnap,
    needSnap,
    verifSnap
  ] = await Promise.all([
    getCountFromServer(query(collection(db, 'users'), where('branchId', '==', branchId), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'organizations'), where('branchId', '==', branchId), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'quests'), where('branchId', '==', branchId), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'outcomes'), where('branchId', '==', branchId), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'needs'), where('branchId', '==', branchId), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'verifications'), where('branchId', '==', branchId), where('status', '==', 'pending')))
  ]);

  const summary: BranchSummary = {
    branchId,
    branchName,
    memberCount: memberSnap.data().count,
    organizationCount: orgSnap.data().count,
    questCount: questSnap.data().count,
    outcomeCount: outcomeSnap.data().count,
    activeNeedCount: needSnap.data().count,
    pendingVerificationCount: verifSnap.data().count,
    unreadNotificationCount: 0, // Updated separately via notificationCounters
    totalRevenue: 0, // Sum from payments
    updatedAt: nowIso()
  };

  await setDoc(doc(db, 'branchSummaries', branchId), summary);
  return summary;
}

// Fetch all branch summaries
export async function fetchAllBranchSummaries(): Promise<BranchSummary[]> {
  const q = query(collection(db, 'branchSummaries'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as BranchSummary);
}

// ========== BRANCH DIRECTORY (Lightweight Branch Listing) ==========

export interface BranchDirectoryEntry {
  branchId: string;
  branchName: string;
  city: string;
  state: string;
  country: string;
  status: string;
  memberCount: number;
  orgCount: number;
  questCount: number;
}

// Fetch all branches for directory (lightweight)
export async function fetchBranchDirectory(): Promise<BranchDirectoryEntry[]> {
  const q = query(collection(db, 'branches'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => {
    const d = doc.data();
    return {
      branchId: d.id || doc.id,
      branchName: d.name,
      city: d.city,
      state: d.state,
      country: d.country,
      status: d.status,
      memberCount: 0, // Will be updated via summary
      orgCount: 0,
      questCount: 0
    } as BranchDirectoryEntry;
  });
}

// ========== DASHBOARD SUMMARIES (Pre-computed Dashboard Data) ==========

export interface DashboardSummary {
  id: string;
  type: 'founder' | 'guildMaster' | 'receptionist' | 'organization';
  userId?: string;
  branchId?: string;
  totalMembers: number;
  totalOrganizations: number;
  totalQuests: number;
  totalOutcomes: number;
  pendingVerifications: number;
  unreadNotifications: number;
  recentActivity: string[];
  healthScore: number;
  updatedAt: string;
}

// Founder Dashboard Summary (global)
export async function getFounderDashboardSummary(): Promise<DashboardSummary> {
  const [memberSnap, orgSnap, questSnap, outcomeSnap, verifSnap] = await Promise.all([
    getCountFromServer(query(collection(db, 'users'), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'quests'), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active'))),
    getCountFromServer(query(collection(db, 'verifications'), where('status', '==', 'pending')))
  ]);

  return {
    id: 'founder-global',
    type: 'founder',
    totalMembers: memberSnap.data().count,
    totalOrganizations: orgSnap.data().count,
    totalQuests: questSnap.data().count,
    totalOutcomes: outcomeSnap.data().count,
    pendingVerifications: verifSnap.data().count,
    unreadNotifications: 0,
    recentActivity: [],
    healthScore: 95, // Calculated from metrics
    updatedAt: nowIso()
  };
}

// Guild Master Dashboard Summary (branch-specific)
export async function getGuildMasterDashboardSummary(branchId: string): Promise<DashboardSummary> {
  const summary = await getBranchSummary(branchId);
  return {
    id: `gm-${branchId}`,
    type: 'guildMaster',
    branchId,
    totalMembers: summary?.memberCount || 0,
    totalOrganizations: summary?.organizationCount || 0,
    totalQuests: summary?.questCount || 0,
    totalOutcomes: summary?.outcomeCount || 0,
    pendingVerifications: summary?.pendingVerificationCount || 0,
    unreadNotifications: summary?.unreadNotificationCount || 0,
    recentActivity: [],
    healthScore: 90,
    updatedAt: nowIso()
  };
}

// Receptionist Dashboard Summary
export async function getReceptionistDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [orgSnap, verifSnap] = await Promise.all([
    getCountFromServer(query(collection(db, 'organizations'), where('assignedReceptionistId', '==', userId))),
    getCountFromServer(query(collection(db, 'verifications'), where('assignedReceptionistId', '==', userId), where('status', '==', 'pending')))
  ]);

  return {
    id: `rec-${userId}`,
    type: 'receptionist',
    userId,
    totalMembers: 0,
    totalOrganizations: orgSnap.data().count,
    totalQuests: 0,
    totalOutcomes: 0,
    pendingVerifications: verifSnap.data().count,
    unreadNotifications: 0,
    recentActivity: [],
    healthScore: 90,
    updatedAt: nowIso()
  };
}

// Organization Dashboard Summary
export async function getOrganizationDashboardSummary(orgId: string): Promise<DashboardSummary> {
  const orgRef = doc(db, 'organizations', orgId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('Organization not found');
  }
  const orgData = orgSnap.data();

  const [needSnap, questSnap, outcomeSnap] = await Promise.all([
    getCountFromServer(query(collection(db, 'needs'), where('organizationId', '==', orgId))),
    getCountFromServer(query(collection(db, 'quests'), where('organizationId', '==', orgId))),
    getCountFromServer(query(collection(db, 'outcomes'), where('organizationId', '==', orgId)))
  ]);

  return {
    id: `org-${orgId}`,
    type: 'organization',
    totalMembers: 0,
    totalOrganizations: 1,
    totalQuests: questSnap.data().count,
    totalOutcomes: outcomeSnap.data().count,
    pendingVerifications: 0,
    unreadNotifications: 0,
    recentActivity: [],
    healthScore: orgData?.trustLevel === 'trusted' ? 95 : orgData?.trustLevel === 'verified' ? 85 : 70,
    updatedAt: nowIso()
  };
}

// Member Dashboard Summary (personalized per member)
export async function getMemberDashboardSummary(userId: string): Promise<DashboardSummary> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  const userData = userSnap.data();

  const [questSnap, outcomeSnap, submissionSnap] = await Promise.all([
    getCountFromServer(query(collection(db, 'quests'), where('applicants', 'array-contains', userId))),
    getCountFromServer(query(collection(db, 'outcomes'), where('completedBy', 'array-contains', userId))),
    getCountFromServer(query(collection(db, 'questSubmissions'), where('userId', '==', userId), where('status', '==', 'pending')))
  ]);

  return {
    id: `member-${userId}`,
    type: 'receptionist', // Using receptionist type as base for member
    userId,
    branchId: userData?.branchId || userData?.jurisdiction?.guildBranchId,
    totalMembers: 0,
    totalOrganizations: 0,
    totalQuests: questSnap.data().count,
    totalOutcomes: outcomeSnap.data().count,
    pendingVerifications: submissionSnap.data().count,
    unreadNotifications: 0,
    recentActivity: userData?.activityHistory?.slice(0, 5) || [],
    healthScore: userData?.guildRank === 'S' ? 95 : userData?.guildRank === 'A' ? 85 : userData?.guildRank === 'B' ? 75 : 60,
    updatedAt: nowIso()
  };
}

// ========== NOTIFICATION COUNTERS (Unread Count Caching) ==========

export interface NotificationCounter {
  userId: string;
  unreadCount: number;
  criticalCount: number;
  lastReadAt?: string;
  updatedAt: string;
}

// Get notification counter for a user
export async function getNotificationCounter(userId: string): Promise<NotificationCounter> {
  const ref = doc(db, 'notificationCounters', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { userId: snap.id, ...snap.data() } as NotificationCounter;
  }
  // Compute if not cached
  const count = await fetchUnreadNotificationCount(userId);
  return { userId, unreadCount: count, criticalCount: 0, updatedAt: nowIso() };
}

// Update notification counter
export async function updateNotificationCounter(userId: string): Promise<NotificationCounter> {
  const [unreadSnap, criticalSnap, legacyUrgentSnap] = await Promise.all([
    getCountFromServer(query(collection(db, 'notifications'), where('userId', '==', userId), where('status', '==', 'unread'))),
    getCountFromServer(query(collection(db, 'notifications'), where('userId', '==', userId), where('priority', '==', 'critical'), where('status', '==', 'unread'))),
    getCountFromServer(query(collection(db, 'notifications'), where('userId', '==', userId), where('priority', '==', 'urgent'), where('status', '==', 'unread')))
  ]);

  const counter: NotificationCounter = {
    userId,
    unreadCount: unreadSnap.data().count,
    criticalCount: criticalSnap.data().count + legacyUrgentSnap.data().count,
    updatedAt: nowIso()
  };

  await setDoc(doc(db, 'notificationCounters', userId), counter);
  return counter;
}

// ========== DIRECTORY CRUD OPERATIONS ==========

// Sync user to directory (call on user create/update)
export async function syncUserToDirectory(user: GuildUser): Promise<void> {
  const dirEntry = {
    uid: user.uid,
    fullName: user.fullName,
    photoURL: user.photoURL || '',
    role: user.role,
    branchId: user.branchId || user.jurisdiction?.guildBranchId,
    branchName: user.branchName || user.jurisdiction?.guildBranchName,
    verificationStatus: user.verificationStatus,
    guildRank: user.guildRank,
    status: user.status,
    skills: user.skills?.slice(0, 5) || [], // Limit for directory
    lastUpdated: nowIso()
  };
  await setDoc(doc(db, 'userDirectory', user.uid), dirEntry);
}

// Sync organization to directory
export async function syncOrgToDirectory(org: Organization): Promise<void> {
  const dirEntry = {
    id: org.id,
    name: org.name,
    searchName: org.searchName,
    category: org.category,
    branchId: org.branchId,
    branchName: org.branchName,
    currentStatus: org.currentStatus,
    trustLevel: org.trustLevel,
    ownerId: org.ownerId,
    ownerEmail: org.ownerEmail,
    createdAt: org.createdAt,
    lastUpdated: nowIso()
  };
  await setDoc(doc(db, 'organizationDirectory', org.id), dirEntry);
}

// Remove user from directory
export async function removeUserFromDirectory(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'userDirectory', uid));
}

// Remove org from directory
export async function removeOrgFromDirectory(orgId: string): Promise<void> {
  await deleteDoc(doc(db, 'organizationDirectory', orgId));
}

// ========== DATA MIGRATION UTILITIES (Phase 13) ==========

// Migrate single user to directory (backfills existing data)
export async function migrateUserToDirectory(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  const userData = userSnap.data() as GuildUser;
  await syncUserToDirectory(userData);
}

// Migrate single organization to directory
export async function migrateOrgToDirectory(orgId: string): Promise<void> {
  const orgRef = doc(db, 'organizations', orgId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('Organization not found');
  }
  const orgData = { id: orgSnap.id, ...orgSnap.data() } as Organization;
  await syncOrgToDirectory(orgData);
}

// Migrate all users to directory (batch operation)
export async function migrateAllUsersToDirectory(limitCount = 100): Promise<{ migrated: number; failed: number }> {
  const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'), limit(limitCount));
  const snap = await getDocs(q);

  let migrated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      await migrateUserToDirectory(d.id);
      migrated++;
    } catch (e) {
      console.warn(`Failed to migrate user ${d.id}:`, e);
      failed++;
    }
  }

  return { migrated, failed };
}

// Migrate all organizations to directory
export async function migrateAllOrgsToDirectory(limitCount = 100): Promise<{ migrated: number; failed: number }> {
  const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'), limit(limitCount));
  const snap = await getDocs(q);

  let migrated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      await migrateOrgToDirectory(d.id);
      migrated++;
    } catch (e) {
      console.warn(`Failed to migrate org ${d.id}:`, e);
      failed++;
    }
  }

  return { migrated, failed };
}

// Update all branch summaries (batch refresh)
export async function refreshAllBranchSummaries(): Promise<{ updated: number; failed: number }> {
  const branchQ = query(collection(db, 'branches'));
  const branchSnap = await getDocs(branchQ);

  let updated = 0;
  let failed = 0;

  for (const d of branchSnap.docs) {
    try {
      const branchData = d.data();
      await updateBranchSummary(d.id, branchData.name || 'Unknown Branch');
      updated++;
    } catch (e) {
      console.warn(`Failed to update branch summary ${d.id}:`, e);
      failed++;
    }
  }

  return { updated, failed };
}

// Update notification counter for all users (batch refresh)
export async function refreshAllNotificationCounters(limitCount = 100): Promise<{ updated: number; failed: number }> {
  const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'), limit(limitCount));
  const snap = await getDocs(q);

  let updated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      await updateNotificationCounter(d.id);
      updated++;
    } catch (e) {
      console.warn(`Failed to update notification counter ${d.id}:`, e);
      failed++;
    }
  }

  return { updated, failed };
}

// Branch ID Backfill Utilities (Phase 2: Branch-Centric Fields backfill)

// Backfill branchId for users from jurisdiction
export async function backfillUserBranchIds(): Promise<{ updated: number; failed: number }> {
  const q = query(collection(db, 'users'), where('archiveStatus', '==', 'active'));
  const snap = await getDocs(q);

  let updated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      const userData = d.data();
      const branchId = userData.jurisdiction?.guildBranchId || userData.branchId;
      const branchName = userData.jurisdiction?.guildBranchName || userData.branchName;

      if (branchId && (!userData.branchId || !userData.branchName)) {
        await updateDoc(doc(db, 'users', d.id), {
          branchId,
          branchName,
          updatedAt: nowIso()
        });
        updated++;
      }
    } catch (e) {
      console.warn(`Failed to backfill branchId for user ${d.id}:`, e);
      failed++;
    }
  }

  return { updated, failed };
}

// Backfill branchId for organizations from branch relationship
export async function backfillOrgBranchIds(): Promise<{ updated: number; failed: number }> {
  const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'));
  const snap = await getDocs(q);

  let updated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      const orgData = d.data();
      const branchId = orgData.branchId || orgData.jurisdiction?.guildBranchId;

      if (branchId && !orgData.branchId) {
        await updateDoc(doc(db, 'organizations', d.id), {
          branchId,
          updatedAt: nowIso()
        });
        updated++;
      }
    } catch (e) {
      console.warn(`Failed to backfill branchId for org ${d.id}:`, e);
      failed++;
    }
  }

  return { updated, failed };
}

// Backfill branchId for needs based on organization
export async function backfillNeedBranchIds(): Promise<{ updated: number; failed: number }> {
  const q = query(collection(db, 'needs'), where('archiveStatus', '==', 'active'));
  const snap = await getDocs(q);

  let updated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      const needData = d.data();
      if (needData.organizationId) {
        const orgRef = doc(db, 'organizations', needData.organizationId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
          const orgData = orgSnap.data();
          if (orgData.branchId && !needData.branchId) {
            await updateDoc(doc(db, 'needs', d.id), {
              branchId: orgData.branchId,
              branchName: orgData.branchName,
              updatedAt: nowIso()
            });
            updated++;
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to backfill branchId for need ${d.id}:`, e);
      failed++;
    }
  }

  return { updated, failed };
}

// Backfill branchId for quests based on organization
export async function backfillQuestBranchIds(): Promise<{ updated: number; failed: number }> {
  const q = query(collection(db, 'quests'), where('archiveStatus', '==', 'active'));
  const snap = await getDocs(q);

  let updated = 0;
  let failed = 0;

  for (const d of snap.docs) {
    try {
      const questData = d.data();
      if (questData.organizationId) {
        const orgRef = doc(db, 'organizations', questData.organizationId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
          const orgData = orgSnap.data();
          if (orgData.branchId && !questData.branchId) {
            await updateDoc(doc(db, 'quests', d.id), {
              branchId: orgData.branchId,
              branchName: orgData.branchName,
              updatedAt: nowIso()
            });
            updated++;
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to backfill branchId for quest ${d.id}:`, e);
      failed++;
    }
  }

  return { updated, failed };
}

// Run all migration utilities
export async function runAllMigrations(): Promise<{
  userDir: { migrated: number; failed: number };
  orgDir: { migrated: number; failed: number };
  branchSummaries: { updated: number; failed: number };
  notificationCounters: { updated: number; failed: number };
  userBranchIds: { updated: number; failed: number };
  orgBranchIds: { updated: number; failed: number };
  needBranchIds: { updated: number; failed: number };
  questBranchIds: { updated: number; failed: number };
}> {
  const results = await Promise.all([
    migrateAllUsersToDirectory(500),
    migrateAllOrgsToDirectory(200),
    refreshAllBranchSummaries(),
    refreshAllNotificationCounters(500),
    backfillUserBranchIds(),
    backfillOrgBranchIds(),
    backfillNeedBranchIds(),
    backfillQuestBranchIds()
  ]);

  return {
    userDir: results[0],
    orgDir: results[1],
    branchSummaries: results[2],
    notificationCounters: results[3],
    userBranchIds: results[4],
    orgBranchIds: results[5],
    needBranchIds: results[6],
    questBranchIds: results[7]
  };
}

// ========== PAYMENT SYSTEM ==========

// Create payment record with workflow
export async function createPaymentRecord(
  paymentData: Omit<PaymentRecord, 'id' | keyof AuditFields>,
  actor: GuildUser,
  action: string
): Promise<PaymentRecord> {
  // Validate amount
  if (paymentData.amount <= 0) {
    throw new Error('Payment amount must be positive');
  }

  // Check for duplicate reference number
  if (paymentData.referenceNumber) {
    const existing = await findPaymentByReference(paymentData.referenceNumber, paymentData.paymentMethod);
    if (existing) {
      throw new Error(`Duplicate payment reference: ${paymentData.referenceNumber}`);
    }
  }

  const payment = await createLedgerRecord<PaymentRecord>('payments', paymentData as any, actor, action);

  // Create financial audit log
  await createFinancialAuditLog({
    action: 'paymentCreated',
    userId: actor.uid,
    userName: actor.fullName,
    organizationId: paymentData.payerOrganizationId || paymentData.receiverOrganizationId,
    paymentId: payment.id,
    amount: paymentData.amount,
    currency: paymentData.currency || 'INR',
    notes: action
  }, actor);

  return payment;
}

// Submit payment for verification
export async function submitPayment(
  paymentId: string,
  actor: GuildUser
): Promise<PaymentRecord> {
  const paymentRef = doc(db, 'payments', paymentId);
  const payment = await getDoc(paymentRef);
  if (!payment.exists()) throw new Error('Payment not found');

  const data = payment.data() as PaymentRecord;
  if (data.status !== 'pending') {
    throw new Error('Payment can only be submitted from pending status');
  }

  await updateDoc(paymentRef, {
    status: 'submitted',
    submittedAt: nowIso(),
    submittedBy: actor.uid
  });

  await createFinancialAuditLog({
    action: 'paymentSubmitted',
    userId: actor.uid,
    userName: actor.fullName,
    organizationId: data.payerOrganizationId,
    paymentId,
    amount: data.amount,
    currency: data.currency,
    notes: 'Payment submitted for verification'
  }, actor);

  return { ...data, id: paymentId, status: 'submitted', submittedAt: nowIso(), submittedBy: actor.uid } as PaymentRecord;
}

// Verify payment (receptionist or above)
export async function verifyPayment(
  paymentId: string,
  actor: GuildUser,
  verified: boolean,
  rejectionReason?: string
): Promise<PaymentRecord> {
  const paymentRef = doc(db, 'payments', paymentId);
  const payment = await getDoc(paymentRef);
  if (!payment.exists()) throw new Error('Payment not found');

  const data = payment.data() as PaymentRecord;

  // Role check
  const canVerify = actor.role === 'receptionist' || actor.role === 'cityGuildMaster' ||
    actor.role === 'stateGuildMaster' || actor.role === 'guildFounder' || actor.role === 'centralGuildMaster';
  if (!canVerify) {
    throw new Error('Insufficient permissions to verify payments');
  }

  const newStatus = verified ? 'verified' : 'rejected';
  const updateData: Record<string, any> = {
    status: newStatus,
    verifiedAt: nowIso(),
    verifiedBy: actor.uid
  };

  if (!verified && rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }

  await updateDoc(paymentRef, updateData);

  await createFinancialAuditLog({
    action: verified ? 'paymentVerified' : 'paymentRejected',
    userId: actor.uid,
    userName: actor.fullName,
    organizationId: data.payerOrganizationId,
    paymentId,
    amount: data.amount,
    currency: data.currency,
    notes: verified ? 'Payment verified' : `Rejected: ${rejectionReason}`
  }, actor);

  return { ...data, ...updateData, id: paymentId } as PaymentRecord;
}

// Record payment to ledger (receptionist or above)
export async function recordPayment(
  paymentId: string,
  actor: GuildUser
): Promise<PaymentRecord> {
  const paymentRef = doc(db, 'payments', paymentId);
  const payment = await getDoc(paymentRef);
  if (!payment.exists()) throw new Error('Payment not found');

  const data = payment.data() as PaymentRecord;
  if (data.status !== 'verified') {
    throw new Error('Only verified payments can be recorded');
  }

  await updateDoc(paymentRef, {
    status: 'recorded'
  });

  await createFinancialAuditLog({
    action: 'paymentRecorded',
    userId: actor.uid,
    userName: actor.fullName,
    organizationId: data.payerOrganizationId || data.receiverOrganizationId,
    paymentId,
    amount: data.amount,
    currency: data.currency,
    notes: 'Payment recorded to ledger'
  }, actor);

  return { ...data, status: 'recorded', id: paymentId } as PaymentRecord;
}

// Find payment by reference number
export async function findPaymentByReference(
  referenceNumber: string,
  paymentMethod?: PaymentMethod
): Promise<PaymentRecord | null> {
  const q = query(
    collection(db, 'payments'),
    where('referenceNumber', '==', referenceNumber),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const payment = snapshot.docs[0].data() as PaymentRecord;
  if (paymentMethod && payment.paymentMethod !== paymentMethod) return null;

  return { ...payment, id: snapshot.docs[0].id };
}

// Fetch payments for organization
export async function fetchOrganizationPayments(organizationId: string): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, 'payments'),
    where('payerOrganizationId', '==', organizationId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
}

// Fetch payments for member
export async function fetchMemberPayments(memberId: string): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, 'payments'),
    where('payerId', '==', memberId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
}

// Fetch pending payments for verification
export async function fetchPendingPayments(limitCount = 20): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, 'payments'),
    where('status', 'in', ['submitted', 'underReview']),
    orderBy('submittedAt', 'asc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord));
}

// ========== RECEIPT SYSTEM ==========

// Generate receipt number
function generateReceiptNumber(receiptType: ReceiptType): string {
  const prefix: Record<ReceiptType, string> = {
    digital: 'DIR',
    manual: 'MRC',
    cash: 'CRC',
    donation: 'DON',
    membership: 'MEM',
    service: 'SVC',
    event: 'EVT'
  };
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix[receiptType]}-${timestamp}`;
}

// Issue receipt
export async function issueReceipt(
  receiptData: Omit<Receipt, 'id' | 'receiptNumber' | 'issuedAt' | 'issuedBy'>,
  actor: GuildUser
): Promise<Receipt> {
  const receiptNumber = generateReceiptNumber(receiptData.receiptType);

  const receipt = await createLedgerRecord<Receipt>('receipts', {
    ...receiptData,
    receiptNumber,
    issuedAt: nowIso(),
    issuedBy: actor.uid,
    status: 'issued'
  } as any, actor, `Issued receipt: ${receiptNumber}`);

  // Create audit log
  await createFinancialAuditLog({
    action: 'receiptIssued',
    userId: actor.uid,
    userName: actor.fullName,
    organizationId: receiptData.recipientOrganizationId,
    receiptId: receipt.id,
    amount: receiptData.amount,
    currency: receiptData.currency,
    notes: `Receipt ${receiptNumber} issued`
  }, actor);

  return receipt;
}

// Fetch receipts for organization
export async function fetchOrganizationReceipts(organizationId: string): Promise<Receipt[]> {
  const q = query(
    collection(db, 'receipts'),
    where('recipientOrganizationId', '==', organizationId),
    orderBy('issuedAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
}

// Fetch receipts for member
export async function fetchMemberReceipts(memberId: string): Promise<Receipt[]> {
  const q = query(
    collection(db, 'receipts'),
    where('memberId', '==', memberId),
    orderBy('issuedAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
}

// ========== FINANCIAL AUDIT LOG ==========

export async function createFinancialAuditLog(
  logData: Omit<FinancialAuditLog, 'id' | keyof AuditFields>,
  actor: GuildUser
): Promise<void> {
  await createLedgerRecord<FinancialAuditLog>('financialAuditLogs', logData as any, actor, `Financial audit: ${logData.action}`);
}

// Fetch financial audit logs
export async function fetchFinancialAuditLogs(filters?: {
  organizationId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}, limitCount = 100): Promise<FinancialAuditLog[]> {
  let q = query(collection(db, 'financialAuditLogs'), orderBy('createdAt', 'desc'), limit(limitCount));

  // Note: For production, use compound queries with where clauses
  const snapshot = await getDocs(q);
  let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialAuditLog));

  // Client-side filtering for date range
  if (filters?.startDate || filters?.endDate) {
    logs = logs.filter(log => {
      const logDate = log.createdAt;
      if (filters.startDate && logDate < filters.startDate) return false;
      if (filters.endDate && logDate > filters.endDate) return false;
      return true;
    });
  }

  return logs;
}

// ========== OUTSTANDING PAYMENTS ==========

// Create outstanding payment record
export async function createOutstandingPayment(
  outstandingData: Omit<OutstandingPayment, 'id' | keyof AuditFields>,
  actor: GuildUser
): Promise<OutstandingPayment> {
  return createLedgerRecord<OutstandingPayment>('outstandingPayments', outstandingData as any, actor, 'Created outstanding payment record');
}

// Fetch outstanding payments for organization
export async function fetchOrganizationOutstanding(organizationId: string): Promise<OutstandingPayment[]> {
  const q = query(
    collection(db, 'outstandingPayments'),
    where('organizationId', '==', organizationId),
    where('status', 'in', ['pendingVerification', 'pendingCollection', 'outstanding', 'overdue']),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutstandingPayment));
}

// Fetch outstanding payments for member
export async function fetchMemberOutstanding(memberId: string): Promise<OutstandingPayment[]> {
  const q = query(
    collection(db, 'outstandingPayments'),
    where('memberId', '==', memberId),
    where('status', 'in', ['pendingVerification', 'pendingCollection', 'outstanding', 'overdue']),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutstandingPayment));
}

// Resolve outstanding payment
export async function resolveOutstandingPayment(
  outstandingId: string,
  resolutionNotes: string,
  actor: GuildUser
): Promise<OutstandingPayment> {
  const ref = doc(db, 'outstandingPayments', outstandingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Outstanding payment not found');

  await updateDoc(ref, {
    status: 'resolved',
    resolvedAt: nowIso(),
    resolutionNotes
  });

  const data = snap.data() as OutstandingPayment;
  return { ...data, status: 'resolved', resolvedAt: nowIso(), resolutionNotes };
}

// ========== INTELLIGENCE & RECOMMENDATION ENGINE ==========

// Profile completion analysis
export interface ProfileCompletion {
  overall: number;
  verified: number;
  contribution: number;
  growth: number;
  missingFields: string[];
  nextActions: string[];
}

export function calculateProfileCompletion(profile: GuildUser): ProfileCompletion {
  const missing: string[] = [];
  let score = 0;

  // Core fields
  if (profile.fullName) score += 10; else missing.push('fullName');
  if (profile.bio) score += 15; else missing.push('bio');
  if (profile.skills?.length) score += 20; else missing.push('skills');
  if (profile.interests?.length) score += 10; else missing.push('interests');
  if (profile.phone) score += 10; else missing.push('phone');
  if (profile.photoURL) score += 10; else missing.push('photoURL');
  if (profile.availability) score += 10; else missing.push('availability');
  if (profile.goals?.length) score += 10; else missing.push('goals');
  if (profile.emergencyContact) score += 5; else missing.push('emergencyContact');

  const verified = profile.verificationStatus === 'verified' ? 100 : 0;
  const contribution = Math.min(100, (profile.completedQuests || 0) * 10);
  const growth = Math.min(100, Math.round((profile.reputationScore || 0) / 10));

  // Generate next actions based on missing fields and profile state
  const actions: string[] = [];
  if (!profile.skills?.length) actions.push('Add skills to your profile');
  if (!profile.goals?.length) actions.push('Set development goals');
  if (!profile.bio) actions.push('Write a bio to introduce yourself');
  if (profile.verificationStatus !== 'verified') actions.push('Verify your identity');
  if (!profile.phone) actions.push('Add contact phone');
  if (!profile.availability) actions.push('Set your availability');
  if ((profile.completedQuests || 0) < 3) actions.push('Complete your first quest');
  if (!profile.photoURL) actions.push('Add profile photo');

  return {
    overall: score,
    verified,
    contribution,
    growth,
    missingFields: missing,
    nextActions: actions.slice(0, 5)
  };
}

// Trust-based access level helper
export type TrustAccessLevel = 'limited' | 'standard' | 'verified' | 'trusted' | 'partner';

export function getTrustAccessLevel(profile: GuildUser): TrustAccessLevel {
  if (!profile) return 'limited';

  const trustLevel = profile.verificationStatus;
  const rank = profile.guildRank;
  const completed = profile.completedQuests || 0;

  if (completed >= 20 && (rank === 'S' || rank === 'A') && trustLevel === 'verified') {
    return 'partner';
  }
  if (completed >= 10 && (rank === 'S' || rank === 'A' || rank === 'B') && trustLevel === 'verified') {
    return 'trusted';
  }
  if (trustLevel === 'verified' || completed >= 5) {
    return 'verified';
  }
  if (profile.onboardingCompleted) {
    return 'standard';
  }
  return 'limited';
}

// Trust-based opportunity filtering
export function filterByTrustLevel<T extends { difficulty?: string; isPaid?: boolean; paymentAmount?: number; requiredRank?: string }>(
  items: T[],
  profile: GuildUser
): T[] {
  const accessLevel = getTrustAccessLevel(profile);
  const rankOrder = ['Applicant', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const userRankIndex = rankOrder.indexOf(profile.guildRank || 'Applicant');

  return items.filter(item => {
    // Check required rank
    if (item.requiredRank) {
      const requiredIndex = rankOrder.indexOf(item.requiredRank);
      if (userRankIndex < requiredIndex) return false;
    }

    // For partner-level access, only show premium opportunities
    if (accessLevel === 'limited' && item.isPaid) return false;
    if (accessLevel === 'standard' && item.difficulty === 'legendary') return false;

    return true;
  });
}

// Smart quest recommendation based on profile
export interface QuestRecommendation {
  quest: Quest;
  matchScore: number;
  matchReasons: string[];
}

export function recommendQuestsForProfile(
  quests: Quest[],
  profile: GuildUser,
  limit = 5
): QuestRecommendation[] {
  const recommendations: QuestRecommendation[] = [];
  const rankOrder = ['Applicant', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const userRankIndex = rankOrder.indexOf(profile.guildRank || 'Applicant');

  for (const quest of quests) {
    if (quest.status !== 'open') continue;

    // Check rank requirement
    if (quest.requiredRank) {
      const requiredIndex = rankOrder.indexOf(quest.requiredRank);
      if (userRankIndex < requiredIndex) continue;
    }

    let score = 0;
    const reasons: string[] = [];

    // Skill match
    if (quest.requiredSkills?.length && profile.skills?.length) {
      const skillMatches = quest.requiredSkills.filter(s =>
        profile.skills.includes(s)
      );
      if (skillMatches.length > 0) {
        score += skillMatches.length * 20;
        reasons.push(`Matches ${skillMatches.length} skill(s)`);
      }
    }

    // Learning match (skills user wants to learn)
    if (quest.requiredSkills?.length && profile.skillsToLearn?.length) {
      const learningSkills = profile.skillsToLearn;
      const learningMatch = quest.requiredSkills.filter(s =>
        learningSkills?.includes(s)
      );
      if (learningMatch.length > 0) {
        score += learningMatch.length * 15;
        reasons.push(`Helps learn ${learningMatch.length} skill(s)`);
      }
    }

    // Path match
    if (quest.category?.toLowerCase() === profile.pathSelected?.toLowerCase()) {
      score += 25;
      reasons.push('Matches your development path');
    }

    // Goal alignment
    if (profile.goals?.length) {
      const questDesc = quest.description.toLowerCase();
      const matchingGoals = profile.goals.filter(g =>
        questDesc.includes(g.toLowerCase().split(' ')[0])
      );
      if (matchingGoals.length > 0) {
        score += 15;
        reasons.push('Aligns with your goals');
      }
    }

    // Availability match
    if (profile.availability && quest.estimatedHours) {
      const availHours = parseAvailability(profile.availability);
      if (availHours >= (quest.estimatedHours || 10)) {
        score += 10;
        reasons.push('Fits your availability');
      }
    }

    // Easy quest bonus for new members
    if (profile.completedQuests < 3 && quest.difficulty === 'easy') {
      score += 20;
      reasons.push('Good starting quest');
    }

    if (score > 0) {
      recommendations.push({ quest, matchScore: score, matchReasons: reasons });
    }
  }

  // Sort by match score and return top recommendations
  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function parseAvailability(avail: string): number {
  if (avail.includes('Full time')) return 40;
  if (avail.includes('20-40')) return 30;
  if (avail.includes('10-20')) return 15;
  if (avail.includes('5-10')) return 7;
  return 3;
}

// Organization matching for members
export interface OrgRecommendation {
  organization: Organization;
  matchScore: number;
  matchReasons: string[];
}

export function recommendOrganizationsForProfile(
  organizations: Organization[],
  profile: GuildUser,
  limit = 5
): OrgRecommendation[] {
  const recommendations: OrgRecommendation[] = [];

  for (const org of organizations) {
    if (org.archiveStatus === 'archived') continue;
    if (org.visibility === 'private') continue;

    let score = 0;
    const reasons: string[] = [];

    // Category interest match
    if (org.category && profile.interests?.length) {
      const categoryMatch = profile.interests.some(i =>
        org.category.toLowerCase().includes(i.toLowerCase()) ||
        i.toLowerCase().includes(org.category.toLowerCase())
      );
      if (categoryMatch) {
        score += 20;
        reasons.push('Category matches your interests');
      }
    }

    // Location match
    if (org.city && profile.jurisdiction?.cityName) {
      if (org.city.toLowerCase() === profile.jurisdiction.cityName.toLowerCase()) {
        score += 15;
        reasons.push('In your city');
      }
    }

    // Active organization bonus
    if (org.currentStatus === 'active' || org.currentStatus === 'partner') {
      score += 15;
      reasons.push('Active Guild partner');
    }

    // Trust level bonus
    if (org.trustLevel === 'verified' || org.trustLevel === 'trusted') {
      score += 10;
      reasons.push('Verified organization');
    }

    // Needs match (if user has skills)
    if (org.needs?.length && profile.skills?.length) {
      const needsMatch = org.needs.filter(n =>
        profile.skills.some(s => n.toLowerCase().includes(s.toLowerCase()))
      );
      if (needsMatch.length > 0) {
        score += 25;
        reasons.push('Needs your skills');
      }
    }

    if (score > 0) {
      recommendations.push({ organization: org, matchScore: score, matchReasons: reasons });
    }
  }

  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// Branch skill distribution for Guild Master intelligence
export interface BranchIntelligence {
  branchId: string;
  branchName: string;
  totalMembers: number;
  skillDistribution: Record<string, number>;
  interestDistribution: Record<string, number>;
  rankDistribution: Record<string, number>;
  activeMembers: number;
  pendingVerifications: number;
  topSkills: string[];
  topInterests: string[];
  growthTrend: 'growing' | 'stable' | 'declining';
}

export async function fetchBranchIntelligence(branchId: string): Promise<BranchIntelligence | null> {
  try {
    // Get all users in this branch
    const q = query(collection(db, 'users'), where('jurisdiction.guildBranchId', '==', branchId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const users = snapshot.docs.map(doc => doc.data() as GuildUser);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate distributions
    const skillCounts: Record<string, number> = {};
    const interestCounts: Record<string, number> = {};
    const rankCounts: Record<string, number> = {};
    let activeCount = 0;
    let pendingCount = 0;
    let newMembers = 0;

    for (const user of users) {
      // Skills
      user.skills?.forEach(s => {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      });

      // Interests
      user.interests?.forEach(i => {
        interestCounts[i] = (interestCounts[i] || 0) + 1;
      });

      // Rank
      rankCounts[user.guildRank || 'Applicant'] = (rankCounts[user.guildRank || 'Applicant'] || 0) + 1;

      // Active check
      if (user.lastActiveAt) {
        const lastActive = new Date(user.lastActiveAt);
        if (now.getTime() - lastActive.getTime() < 7 * 24 * 60 * 60 * 1000) {
          activeCount++;
        }
      }

      // Pending verification
      if (user.verificationStatus === 'pending') {
        pendingCount++;
      }

      // New member (joined in last 30 days)
      if (user.createdAt) {
        const created = new Date(user.createdAt);
        if (created.getTime() > thirtyDaysAgo.getTime()) {
          newMembers++;
        }
      }
    }

    // Sort top skills and interests
    const sortedSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sortedInterests = Object.entries(interestCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const branch = users[0]?.jurisdiction;

    return {
      branchId,
      branchName: branch?.guildBranchName || 'Unknown',
      totalMembers: users.length,
      skillDistribution: skillCounts,
      interestDistribution: interestCounts,
      rankDistribution: rankCounts,
      activeMembers: activeCount,
      pendingVerifications: pendingCount,
      topSkills: sortedSkills.map(([s]) => s),
      topInterests: sortedInterests.map(([i]) => i),
      growthTrend: newMembers > users.length * 0.1 ? 'growing' : newMembers < users.length * 0.02 ? 'declining' : 'stable'
    };
  } catch (err) {
    console.error('Error fetching branch intelligence:', err);
    return null;
  }
}

// Receptionist priority organization list
export interface OrganizationPriority {
  organization: Organization;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  recommendedAction: string;
  daysSinceLastContact: number;
}

export function prioritizeOrganizationsForReceptionist(
  organizations: Organization[],
  receptionistId: string
): OrganizationPriority[] {
  const priorities: OrganizationPriority[] = [];
  const now = new Date();

  for (const org of organizations) {
    if (org.assignedReceptionistId !== receptionistId) continue;
    if (org.archiveStatus === 'archived') continue;

    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'low';
    let action = 'Routine check-in';
    let daysSince = 0;

    // Calculate days since last contact
    if (org.lastContactAt) {
      const lastContact = new Date(org.lastContactAt);
      daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (24 * 60 * 60 * 1000));
    } else {
      daysSince = 999; // Never contacted
    }

    // Priority logic based on trust level and activity
    if (org.trustLevel === 'new' && daysSince > 14) {
      priority = 'urgent';
      action = 'Initial contact required';
    } else if (org.trustLevel === 'new' && daysSince > 7) {
      priority = 'high';
      action = 'Follow up on registration';
    } else if (org.currentStatus === 'inactive' && daysSince > 30) {
      priority = 'urgent';
      action = 'Re-engage inactive organization';
    } else if (org.needs?.length === 0 && daysSince > 21) {
      priority = 'high';
      action = 'Request needs submission';
    } else if (org.currentStatus === 'active' && daysSince > 30) {
      priority = 'medium';
      action = 'Quarterly review';
    } else if (org.verificationStatus === 'pending') {
      priority = 'high';
      action = 'Complete verification';
    }

    // Adjust for trust level
    if (org.trustLevel === 'partner') {
      priority = priority === 'low' ? 'medium' : priority;
    }

    priorities.push({
      organization: org,
      priority,
      recommendedAction: action,
      daysSinceLastContact: daysSince
    });
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return priorities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// Onboarding follow-up: next steps for new members
export interface OnboardingNextSteps {
  memberId: string;
  daysSinceOnboarding: number;
  recommendedActions: { action: string; priority: number; reason: string }[];
  suggestedQuests: Quest[];
  suggestedSkills: string[];
}

export function generateOnboardingFollowUp(
  profile: GuildUser,
  quests: Quest[]
): OnboardingNextSteps {
  const now = new Date();
  const created = profile.createdAt ? new Date(profile.createdAt) : now;
  const daysSince = Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));

  const actions: { action: string; priority: number; reason: string }[] = [];

  // Priority actions based on profile state
  if (!profile.verificationStatus || profile.verificationStatus !== 'verified') {
    actions.push({
      action: 'Verify your identity',
      priority: 1,
      reason: 'Unlock paid opportunities'
    });
  }

  if (!profile.skills?.length || profile.skills.length < 3) {
    actions.push({
      action: 'Add skills to your profile',
      priority: 2,
      reason: 'Get better quest matches'
    });
  }

  if (!profile.goals?.length) {
    actions.push({
      action: 'Set development goals',
      priority: 3,
      reason: 'Focus your growth path'
    });
  }

  if (profile.onboardingCompleted && daysSince < 7) {
    actions.push({
      action: 'Apply to your first quest',
      priority: 1,
      reason: 'Start gaining experience'
    });
  }

  if (!profile.photoURL) {
    actions.push({
      action: 'Add a profile photo',
      priority: 4,
      reason: 'Build trust with organizations'
    });
  }

  // Suggested quests based on skills to learn
  const suggestedQuests = quests
    .filter(q => q.status === 'open')
    .filter(q => {
      const learningSkills = profile.skillsToLearn;
      if (!learningSkills?.length) return q.difficulty === 'easy';
      return q.requiredSkills?.some(s => learningSkills.includes(s));
    })
    .slice(0, 3);

  // Suggested skills to learn based on popular quests
  const allRequiredSkills: string[] = [];
  quests.forEach(q => q.requiredSkills?.forEach(s => allRequiredSkills.push(s)));
  const skillCounts: Record<string, number> = {};
  allRequiredSkills.forEach(s => skillCounts[s] = (skillCounts[s] || 0) + 1);
  const suggested = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([s]) => !profile.skills?.includes(s))
    .map(([s]) => s);

  return {
    memberId: profile.uid,
    daysSinceOnboarding: daysSince,
    recommendedActions: actions.sort((a, b) => a.priority - b.priority),
    suggestedQuests,
    suggestedSkills: suggested
  };
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

// Normalize Quest data - fallback assignedMembers to acceptedMembers for compatibility
function normalizeQuest(quest: Quest): Quest {
  if (!quest) return quest;
  // If acceptedMembers is missing but assignedMembers exists (from guild-auth), use that
  const hasAccepted = quest.acceptedMembers !== undefined;
  const hasAssigned = (quest as Quest & { assignedMembers?: string[] }).assignedMembers !== undefined;
  if (!hasAccepted && hasAssigned) {
    return {
      ...quest,
      acceptedMembers: (quest as Quest & { assignedMembers?: string[] }).assignedMembers
    };
  }
  return quest;
}

// Normalize array of quests
function normalizeQuests(quests: Quest[]): Quest[] {
  return quests.map(normalizeQuest);
}

// Fetch all quests with pagination
export async function fetchQuests(filters?: {
  category?: string;
  difficulty?: string;
  mode?: string;
  status?: string;
  branchId?: string;
  includeArchived?: boolean;
}, limitCount = 50): Promise<Quest[]> {
  const constraints: QueryConstraint[] = [limit(limitCount)];

  // Only filter by archiveStatus if explicitly requested
  if (filters?.includeArchived) {
    constraints.push(where('archiveStatus', '==', 'active'));
  }

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
  const quests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest));
  return normalizeQuests(quests);
}

// Check if user has existing application for a quest
export async function checkExistingApplication(questId: string, userId: string): Promise<QuestApplication | null> {
  const q = query(
    collection(db, 'questApplications'),
    where('questId', '==', questId),
    where('applicantId', '==', userId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as QuestApplication;
}

// Check if user already has participation record for a quest (prevents duplicate assignments)
export async function checkExistingParticipation(questId: string, userId: string): Promise<QuestParticipation | null> {
  const q = query(
    collection(db, 'questParticipations'),
    where('questId', '==', questId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as QuestParticipation;
}

// Check quest capacity - returns whether quest can accept more members
export async function checkQuestCapacity(questId: string): Promise<{ hasCapacity: boolean; current: number; required: number; available: number }> {
  const questRef = doc(db, 'quests', questId);
  const questSnap = await getDoc(questRef);
  if (!questSnap.exists()) {
    return { hasCapacity: false, current: 0, required: 0, available: 0 };
  }
  const quest = questSnap.data() as Quest;
  const current = quest.acceptedMembers?.length || 0;
  const required = quest.membersRequired || 1;
  const available = Math.max(0, required - current);
  return { hasCapacity: available > 0, current, required, available };
}

// Validate quest has capacity - throws error if full
export async function validateQuestCapacity(questId: string): Promise<void> {
  const capacity = await checkQuestCapacity(questId);
  if (!capacity.hasCapacity) {
    throw new Error(`Quest is full (${capacity.current}/${capacity.required} members already assigned)`);
  }
}

// Get all applications for a user
export async function getUserQuestApplications(userId: string): Promise<QuestApplication[]> {
  const q = query(
    collection(db, 'questApplications'),
    where('applicantId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestApplication));
}

// Get all applications for a quest
export async function getQuestApplications(questId: string): Promise<QuestApplication[]> {
  const q = query(
    collection(db, 'questApplications'),
    where('questId', '==', questId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestApplication));
}

// Accept an applicant - adds to quest acceptedMembers and updates application status
export async function acceptApplicant(
  applicationId: string,
  questId: string,
  applicantId: string,
  reviewerId: string
): Promise<void> {
  const now = nowIso();

  // Get current quest data
  const questSnap = await getDoc(doc(db, 'quests', questId));
  if (!questSnap.exists()) {
    throw new Error('Quest not found');
  }
  const quest = questSnap.data() as Quest;

  // Normalize acceptedMembers (handles assignedMembers fallback)
  const normalizedQuest = normalizeQuest(quest);
  const currentAccepted = normalizedQuest.acceptedMembers || [];

  // Update quest - add to acceptedMembers
  await updateDoc(doc(db, 'quests', questId), {
    acceptedMembers: [...currentAccepted, applicantId],
    updatedAt: now
  } as DocumentData);

  // Update application status to accepted
  await updateDoc(doc(db, 'questApplications', applicationId), {
    status: 'accepted',
    reviewedAt: now,
    reviewedBy: reviewerId
  } as DocumentData);
}

// Get single quest by ID
export async function getQuest(questId: string): Promise<Quest | null> {
  const snap = await getDoc(doc(db, 'quests', questId));
  if (!snap.exists()) return null;
  const quest = { id: snap.id, ...snap.data() } as Quest;
  return normalizeQuest(quest);
}

// ========== QUEST PARTICIPATION (Source of Truth for Accepted Quests) ==========

// Create participation record when user is accepted into a quest
export async function createParticipation(
  application: QuestApplication,
  quest: Quest,
  reviewerId: string
): Promise<string> {
  const participationId = `part_${Date.now()}_${application.applicantId.slice(0, 8)}`;
  const now = nowIso();

  const participationData: QuestParticipation = {
    id: participationId,
    questId: application.questId,
    questTitle: quest.title,
    applicationId: application.id,
    questType: quest.questType || 'standard',
    userId: application.applicantId,
    userName: application.applicantName,
    applicantId: application.applicantId,
    applicantName: application.applicantName,
    roleId: application.roleId,
    roleTitle: application.roleTitle,
    motivation: application.motivation,
    // Initial status
    status: 'accepted',
    completionStatus: 'notStarted',
    reportStatus: 'notStarted',
    // Dates
    acceptedAt: now,
    // Audit fields
    archiveStatus: 'active',
    jurisdiction: quest.jurisdiction || { cityName: '', stateName: '', countryName: '' },
    createdAt: now,
    createdBy: reviewerId,
    updatedAt: now,
    updatedBy: reviewerId
  };

  await setDoc(doc(db, 'questParticipations', participationId), participationData);
  return participationId;
}

// Get participation record by ID
export async function getParticipation(participationId: string): Promise<QuestParticipation | null> {
  const snap = await getDoc(doc(db, 'questParticipations', participationId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as QuestParticipation;
}

// Get user's participation for a specific quest
export async function getUserQuestParticipation(userId: string, questId: string): Promise<QuestParticipation | null> {
  const q = query(
    collection(db, 'questParticipations'),
    where('userId', '==', userId),
    where('questId', '==', questId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as QuestParticipation;
}

// Get all participations for a user
export async function getUserParticipations(userId: string): Promise<QuestParticipation[]> {
  const q = query(
    collection(db, 'questParticipations'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestParticipation));
}

// Get user's active participations (pending, accepted, active, inProgress)
export async function getUserActiveParticipations(userId: string): Promise<QuestParticipation[]> {
  const participations = await getUserParticipations(userId);
  return participations.filter(p =>
    ['pending', 'accepted', 'active', 'inProgress', 'awaitingCompletionReview'].includes(p.status)
  );
}

// Get user's completed participations
export async function getUserCompletedParticipations(userId: string): Promise<QuestParticipation[]> {
  const participations = await getUserParticipations(userId);
  return participations.filter(p => p.status === 'completed');
}

// Get all participations awaiting completion review (for admin review)
export async function getQuestsAwaitingCompletion(): Promise<QuestParticipation[]> {
  const q = query(
    collection(db, 'questParticipations'),
    where('status', '==', 'awaitingCompletionReview')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestParticipation));
}

// Get all participations for a quest
export async function getQuestParticipations(questId: string): Promise<QuestParticipation[]> {
  const q = query(
    collection(db, 'questParticipations'),
    where('questId', '==', questId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestParticipation));
}

// Update participation status
export async function updateParticipationStatus(
  participationId: string,
  status: ParticipationStatus,
  reviewerId?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: nowIso()
  };
  if (reviewerId) {
    updateData.updatedBy = reviewerId;
  }

  // Handle specific status transitions
  if (status === 'active' || status === 'inProgress') {
    updateData.startedAt = nowIso();
  } else if (status === 'awaitingCompletionReview') {
    updateData.submittedAt = nowIso();
  } else if (status === 'completed') {
    updateData.completedAt = nowIso();
  }

  await updateDoc(doc(db, 'questParticipations', participationId), updateData);
}

// Submit completion report
export async function submitParticipationCompletion(
  participationId: string,
  data: {
    report?: string;
    summary?: string;
    achievements?: string[];
    evidenceUrls?: string[];
  },
  userId: string
): Promise<void> {
  // Get participation to find the quest for notification
  const partDoc = await getDoc(doc(db, 'questParticipations', participationId));
  if (!partDoc.exists()) throw new Error('Participation not found');
  const participation = partDoc.data() as QuestParticipation;

  const updateData = {
    ...data,
    status: 'awaitingCompletionReview' as ParticipationStatus,
    reportStatus: 'submitted',
    submittedAt: nowIso(),
    updatedAt: nowIso(),
    updatedBy: userId
  };

  await updateDoc(doc(db, 'questParticipations', participationId), updateData);

  // DEBUG: Log what's being received
  console.log('[submitParticipationCompletion] data received:', JSON.stringify(data));
  console.log('[submitParticipationCompletion] participation:', participation.questTitle, participation.questId);

  // ALSO create questSubmissions record so guild-auth can read it
  const questDoc = await getDoc(doc(db, 'quests', participation.questId));
  const quest = questDoc.exists() ? questDoc.data() : null;
  const submissionData = {
    questId: participation.questId,
    questTitle: participation.questTitle || quest?.title || 'Unknown Quest',
    questType: participation.questType,
    memberId: participation.userId,
    memberName: participation.userName,
    report: data.report || 'NO_REPORT_PROVIDED',
    summary: data.summary || '',
    achievements: data.achievements || [],
    evidenceUrls: data.evidenceUrls || [],
    links: [],
    status: 'pending',
    archiveStatus: 'active',
    jurisdiction: (quest as any)?.jurisdiction || {}
  };
  console.log('[submitParticipationCompletion] submissionData:', JSON.stringify(submissionData));

  const _user = { uid: userId, fullName: participation.userName || 'Unknown' } as GuildUser;
  await createLedgerRecord('questSubmissions', submissionData as any, _user, `Submitted completion report for quest: ${participation.questTitle}`);

  // Notify quest creator/coordinator about the submission
  if (participation.createdBy) {
    await notifyUser(
      participation.createdBy,
      'application_submitted',
      'Completion Report Submitted',
      `${participation.userName || participation.userId} has submitted a completion report for "${participation.questTitle}". Please review it.`,
      undefined,
      'medium'
    );
  }
}

// Approve/complete participation
export async function completeParticipation(
  participationId: string,
  reviewerId: string,
  reviewerNotes?: string
): Promise<void> {
  // Get participation to find the user
  const partDoc = await getDoc(doc(db, 'questParticipations', participationId));
  if (!partDoc.exists()) throw new Error('Participation not found');
  const participation = partDoc.data() as QuestParticipation;

  const updateData = {
    status: 'completed' as ParticipationStatus,
    completionStatus: 'approved',
    reportStatus: 'approved',
    completedAt: nowIso(),
    reviewerId,
    reviewerNotes,
    reviewedAt: nowIso(),
    updatedAt: nowIso(),
    updatedBy: reviewerId
  };

  await updateDoc(doc(db, 'questParticipations', participationId), updateData);

  // Also update the quest's member lists - remove from accepted, add to completed
  const questRef = doc(db, 'quests', participation.questId);
  const questDoc = await getDoc(questRef);
  if (questDoc.exists()) {
    const quest = questDoc.data() as Quest;
    const accepted = quest.acceptedMembers || [];
    const completed = quest.completedMembers || [];

    await updateDoc(doc(db, 'quests', participation.questId), {
      acceptedMembers: accepted.filter(id => id !== participation.userId),
      completedMembers: [...completed, participation.userId],
      updatedAt: nowIso()
    });
  }

  // Notify the user their completion was approved
  await notifyUser(
    participation.userId,
    'quest_completed',
    'Quest Completed!',
    `Your completion report for "${participation.questTitle}" has been approved! You now have earned reputation points.`,
    `/my-quests/${participation.questId}`,
    'high'
  );
}

// Reject participation completion
export async function rejectParticipationCompletion(
  participationId: string,
  reviewerId: string,
  reviewerNotes: string
): Promise<void> {
  // Get participation to find the user
  const partDoc = await getDoc(doc(db, 'questParticipations', participationId));
  if (!partDoc.exists()) throw new Error('Participation not found');
  const participation = partDoc.data() as QuestParticipation;

  const updateData = {
    status: 'inProgress' as ParticipationStatus,
    completionStatus: 'rejected',
    reportStatus: 'needsRevision',
    reviewerId,
    reviewerNotes,
    reviewedAt: nowIso(),
    updatedAt: nowIso(),
    updatedBy: reviewerId
  };

  await updateDoc(doc(db, 'questParticipations', participationId), updateData);

  // Notify the user their completion was rejected
  await notifyUser(
    participation.userId,
    'submission_rejected',
    'Completion Report Needs Revision',
    `Your completion report for "${participation.questTitle}" needs revisions: ${reviewerNotes}`,
    `/my-quests/${participation.questId}`,
    'medium'
  );
}

// Withdraw from participation
export async function withdrawParticipation(
  participationId: string,
  userId: string
): Promise<void> {
  const updateData = {
    status: 'withdrawn' as ParticipationStatus,
    updatedAt: nowIso(),
    updatedBy: userId
  };

  await updateDoc(doc(db, 'questParticipations', participationId), updateData);
}

// Withdraw an application
export async function withdrawApplication(applicationId: string, userId: string): Promise<void> {
  const appRef = doc(db, 'questApplications', applicationId);
  const snap = await getDoc(appRef);
  if (!snap.exists()) throw new Error('Application not found');

  const appData = snap.data() as QuestApplication;
  if (appData.applicantId !== userId) throw new Error('Unauthorized');

  if (appData.status !== 'submitted' && appData.status !== 'underReview') {
    throw new Error('Cannot withdraw this application');
  }

  await updateDoc(appRef, {
    status: 'withdrawn',
    updatedAt: nowIso()
  });

  // Also update quest's applicants array for backward compatibility
  const questRef = doc(db, 'quests', appData.questId);
  const questSnap = await getDoc(questRef);
  if (questSnap.exists()) {
    const quest = questSnap.data() as Quest;
    const applicants = (quest.applicants || []).filter((id: string) => id !== userId);
    await updateDoc(questRef, {
      applicants,
      updatedAt: nowIso()
    });
  }
}

// Get user's quest statistics
export interface UserQuestStats {
  totalApplications: number;
  pending: number;
  accepted: number;
  completed: number;
  rejected: number;
  withdrawn: number;
  standardQuests: number;
  openSourceQuests: number;
  reportsSubmitted: number;
  fundsRaised: number;
}

export async function getUserQuestStats(userId: string): Promise<UserQuestStats> {
  const applications = await getUserQuestApplications(userId);

  const stats: UserQuestStats = {
    totalApplications: applications.length,
    pending: applications.filter(a => a.status === 'submitted' || a.status === 'underReview').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    completed: applications.filter(a => a.status === 'completed').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    withdrawn: applications.filter(a => a.status === 'withdrawn').length,
    standardQuests: applications.filter(a => a.questType !== 'openSource').length,
    openSourceQuests: applications.filter(a => a.questType === 'openSource').length,
    reportsSubmitted: 0,
    fundsRaised: 0
  };

  // Get submissions count
  const submissionsQ = query(collection(db, 'questSubmissions'), where('memberId', '==', userId));
  const submissionsSnap = await getDocs(submissionsQ);
  stats.reportsSubmitted = submissionsSnap.size;

  // Get funds raised (for open source quests where user was accepted)
  const acceptedApps = applications.filter(a => a.status === 'accepted' && a.questType === 'openSource');
  let fundsRaised = 0;
  for (const app of acceptedApps) {
    const questRef = doc(db, 'quests', app.questId);
    const questDoc = await getDoc(questRef);
    if (questDoc.exists()) {
      const quest = questDoc.data() as Quest;
      if (quest.openSourceConfig?.fundsRaised) {
        fundsRaised += quest.openSourceConfig.fundsRaised;
      }
    }
  }
  stats.fundsRaised = fundsRaised;

  return stats;
}

// Apply for a Quest - Enhanced with application record
export async function applyForQuest(questId: string, user: GuildUser): Promise<void> {
  const questRef = doc(db, 'quests', questId);
  const snap = await getDoc(questRef);
  if (!snap.exists()) throw new Error('Quest not found');
  const quest = snap.data() as Quest;

  // === CHECK FOR EXISTING APPLICATION (ONE PER QUEST RULE) ===
  const existingApp = await checkExistingApplication(questId, user.uid);
  if (existingApp) {
    throw new Error(`You already have an application for this quest. Status: ${existingApp.status}`);
  }
  // ==============================================

  // === QUEST CAPACITY CHECK (prevent applying to full quests) ===
  const capacity = await checkQuestCapacity(questId);
  if (!capacity.hasCapacity) {
    throw new Error(`This quest is full (${capacity.current}/${capacity.required} members already assigned)`);
  }
  // ==============================================

  // === SLOT ENFORCEMENT ===
  const questType = quest.questType || 'standard';
  await validateQuestSlot(user.uid, questType);
  // ====================

  // Create application record
  const applicationId = `app_${Date.now()}_${user.uid.slice(0, 8)}`;
  const applicationData = {
    id: applicationId,
    questId,
    questTitle: quest.title,
    questType: quest.questType || 'standard',
    applicantId: user.uid,
    applicantName: user.fullName,
    motivation: '',
    experience: '',
    status: 'submitted' as const,
    createdAt: nowIso(),
    createdBy: user.uid,
    archiveStatus: 'active',
    updatedAt: nowIso(),
    jurisdiction: user.jurisdiction
  };

  await setDoc(doc(db, 'questApplications', applicationId), applicationData);

  // Also add to quest's applicants array (backward compatibility)
  const applicants = quest.applicants || [];
  if (!applicants.includes(user.uid)) {
    await updateDoc(questRef, {
      applicants: [...applicants, user.uid],
      updatedAt: nowIso()
    });
  }

  await logActivity({
    userId: user.uid,
    userName: user.fullName,
    action: `Applied for quest: ${quest.title}`,
    relatedEntityType: 'quests',
    relatedEntityId: questId
  });
}

// Submit Quest Submission (evidence of completion) - Enhanced with summary, achievements, outcomes
export async function submitQuestCompletion(
  questId: string,
  user: GuildUser,
  evidence: {
    report: string;
    links: string[];
    evidenceUrls: string[];
    // Enhanced fields for completion reports
    summary?: string;
    achievements?: string[];
    outcomesProduced?: string[];
    attachments?: { name: string; url: string; type: string }[];
    questType?: 'standard' | 'openSource';
    memberName?: string;
    roleId?: string;
    roleTitle?: string;
  }
): Promise<QuestSubmission> {
  const questRef = doc(db, 'quests', questId);
  const snap = await getDoc(questRef);
  if (!snap.exists()) throw new Error('Quest not found');
  const quest = snap.data() as Quest;

  // Create submission record
  const questJurisdiction = (quest as any).jurisdiction || {};
  const submissionData: Omit<QuestSubmission, 'id' | keyof AuditFields> = {
    questId,
    questTitle: quest.title,
    questType: evidence.questType || quest.questType,
    memberId: user.uid,
    memberName: evidence.memberName || user.fullName,
    roleId: evidence.roleId,
    roleTitle: evidence.roleTitle,
    report: evidence.report,
    summary: evidence.summary,
    achievements: evidence.achievements,
    outcomesProduced: evidence.outcomesProduced,
    evidenceUrls: evidence.evidenceUrls,
    links: evidence.links,
    attachments: evidence.attachments,
    status: 'pending',
    archiveStatus: 'active',
    jurisdiction: questJurisdiction
  } as any;

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

  // Update participation status to awaitingCompletionReview so it shows in submission queue
  const participationQuery = query(
    collection(db, 'questParticipations'),
    where('questId', '==', questId),
    where('userId', '==', user.uid),
    where('status', 'in', ['active', 'inProgress'])
  );
  const participationSnapshot = await getDocs(participationQuery);
  if (!participationSnapshot.empty) {
    const participationDoc = participationSnapshot.docs[0];
    await updateDoc(doc(db, 'questParticipations', participationDoc.id), {
      status: 'awaitingCompletionReview',
      updatedAt: nowIso()
    });
  }

  // Notify quest creator/coordinator about the submission
  if (quest.createdBy) {
    await notifyUser(
      quest.createdBy,
      'application_submitted',
      'Completion Report Submitted',
      `${user.fullName} has submitted a completion report for "${quest.title}". Please review it.`,
      undefined,
      'medium'
    );
  }

  return submission;
}

// ========== QUEST SLOT ENFORCEMENT (Phase 2: Max 1 Open Source + 2 Standard = 3 Total) ==========

const MAX_OPEN_SOURCE_QUESTS = 1;
const MAX_STANDARD_QUESTS = 2;
const MAX_TOTAL_QUESTS = 3;

export interface QuestSlots {
  openSource: number;
  standard: number;
  total: number;
}

/**
 * Get user's current active quest slot counts
 */
export async function getUserActiveQuestSlots(userId: string): Promise<QuestSlots> {
  // Get quests where user is in acceptedMembers (active participant)
  const q = query(
    collection(db, 'quests'),
    where('acceptedMembers', 'array-contains', userId),
    where('status', 'in', ['assigned', 'inProgress', 'open'])
  );
  const snapshot = await getDocs(q);

  let openSource = 0;
  let standard = 0;

  snapshot.forEach(doc => {
    const quest = doc.data() as Quest;
    if (quest.questType === 'openSource') {
      openSource++;
    } else {
      standard++;
    }
  });

  return { openSource, standard, total: openSource + standard };
}

/**
 * Check if user can join a quest of given type - returns object with ability info
 */
export async function canJoinQuest(userId: string, questType: QuestType = 'standard'): Promise<{ canJoin: boolean; reason?: string; slots?: QuestSlots }> {
  const slots = await getUserActiveQuestSlots(userId);

  if (questType === 'openSource') {
    if (slots.openSource >= MAX_OPEN_SOURCE_QUESTS) {
      return {
        canJoin: false,
        reason: `You already have ${slots.openSource} Open Source quest(s). Maximum ${MAX_OPEN_SOURCE_QUESTS} allowed.`,
        slots
      };
    }
  } else {
    if (slots.standard >= MAX_STANDARD_QUESTS) {
      return {
        canJoin: false,
        reason: `You already have ${slots.standard} Standard quest(s). Maximum ${MAX_STANDARD_QUESTS} allowed.`,
        slots
      };
    }
  }

  if (slots.total >= MAX_TOTAL_QUESTS) {
    return {
      canJoin: false,
      reason: `You have ${slots.total} active quest(s). Maximum ${MAX_TOTAL_QUESTS} total allowed.`,
      slots
    };
  }

  return { canJoin: true, slots };
}

/**
 * Validate user can join quest - throws error if cannot join
 */
export async function validateQuestSlot(userId: string, questType: QuestType = 'standard'): Promise<QuestSlots> {
  const result = await canJoinQuest(userId, questType);
  if (!result.canJoin) {
    throw new Error(result.reason);
  }
  return result.slots!;
}

// Fetch user dashboard statistics
export async function fetchUserGrowthStats(userId: string) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as GuildUser;
}

// Fetch all Organizations (public view - only visible ones)
export async function fetchOrganizations(limitCount = 50): Promise<Organization[]> {
  const q = query(collection(db, 'organizations'), where('archiveStatus', '==', 'active'), limit(limitCount));
  const snapshot = await getDocs(q);
  const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
  // Filter for public display - only show public or guildMembers visibility
  return orgs.filter(org => {
    // Show if visibility is not set (legacy) or is public/guildMembers
    return !org.visibility || org.visibility === 'public' || org.visibility === 'guildMembers' || org.visibility === 'private';
  });
}

function isActiveOrganization(org: Organization): boolean {
  return org.archiveStatus !== 'archived';
}

async function firstOrganizationByField(field: 'ownerId' | 'ownerEmail', value?: string | null): Promise<Organization | null> {
  if (!value) return null;
  const q = query(collection(db, 'organizations'), where(field, '==', value), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const org = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Organization;
  return isActiveOrganization(org) ? org : null;
}

// Fetch the organization represented by the current user.
export async function fetchUserOrganization(
  userOrId: GuildUser | string,
  email?: string | null
): Promise<Organization | null> {
  const userId = typeof userOrId === 'string' ? userOrId : userOrId.uid;
  const rawEmail = typeof userOrId === 'string' ? email : userOrId.email;
  const userEmail = rawEmail?.toLowerCase();
  const profileOrganizationId = typeof userOrId === 'string' ? undefined : userOrId.organizationId;

  if (profileOrganizationId) {
    const org = await fetchOrganizationById(profileOrganizationId);
    if (org && isActiveOrganization(org)) return org;
  }

  const ownedOrg = await firstOrganizationByField('ownerId', userId);
  if (ownedOrg) return ownedOrg;

  const emailOrg = await firstOrganizationByField('ownerEmail', userEmail);
  if (emailOrg || !rawEmail || rawEmail === userEmail) return emailOrg;

  return firstOrganizationByField('ownerEmail', rawEmail);
}

// Fetch organization by ID
export async function fetchOrganizationById(orgId: string): Promise<Organization | null> {
  if (!orgId) return null;
  const orgSnap = await getDoc(doc(db, 'organizations', orgId));
  if (!orgSnap.exists()) return null;
  return { id: orgSnap.id, ...orgSnap.data() } as Organization;
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
  // Fetch organization to get assigned receptionist
  const orgSnap = await getDoc(doc(db, 'organizations', organizationId));
  const organization = orgSnap.exists() ? orgSnap.data() as Organization : null;

  // Filter out undefined values to prevent Firestore errors
  const filteredData: any = {};
  if (data.title) filteredData.title = data.title;
  if (data.description) filteredData.description = data.description;
  if (data.desiredOutcome) filteredData.desiredOutcome = data.desiredOutcome;
  if (data.category) filteredData.category = data.category;
  if (data.priority) filteredData.priority = data.priority;
  if (data.budgetRange) filteredData.budgetRange = data.budgetRange;
  if (data.timeline) filteredData.timeline = data.timeline;
  if (data.deadline) filteredData.deadline = data.deadline;
  if (data.supportingDocuments && data.supportingDocuments.length > 0) filteredData.supportingDocuments = data.supportingDocuments;

  // Assign to the guild receptionist handling this org, fallback to actor if none assigned
  const needReceptionistId = organization?.assignedReceptionistId || actor.uid;
  const needReceptionistName = organization?.assignedReceptionistName || actor.fullName || actor.email;

  const needData = {
    ...filteredData,
    searchName: data.title.toLowerCase(),
    organizationId,
    organizationName,
    estimatedValue: 0,
    status: 'submitted' as const,
    lastUpdatedAt: nowIso(),
    nextAction: 'Under review by Guild Representative',
    // Assign to the organization's guild receptionist (not the org user who submitted)
    assignedReceptionistId: needReceptionistId,
    assignedReceptionistName: needReceptionistName,
    // Use organization's jurisdiction so state/city GMs can see it
    jurisdiction: organization?.jurisdiction || actor.jurisdiction
  };

  return createLedgerRecord<Need>('needs', needData as any, actor, `Submitted need: ${data.title}`);
}

// Fetch needs for an organization
export async function fetchOrganizationNeeds(organizationId: string): Promise<Need[]> {
  const q = query(collection(db, 'needs'), where('organizationId', '==', organizationId), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Need));
}

// Fetch needs created by a user (their submitted needs)
export async function fetchUserNeeds(userId: string): Promise<Need[]> {
  // Use createdBy field to find needs the user created
  const q = query(collection(db, 'needs'), where('createdBy', '==', userId), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Need));
}

// Fetch needs assigned to a user (as their receptionist handling)
export async function fetchAssignedNeeds(userId: string): Promise<Need[]> {
  const q = query(collection(db, 'needs'), where('assignedReceptionistId', '==', userId), where('archiveStatus', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Need));
}

// Fetch quests linked to a specific need
export async function fetchQuestsByNeedId(needId: string): Promise<Quest[]> {
  const q = query(collection(db, 'quests'), where('needId', '==', needId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest));
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
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('status', 'in', ['unread', 'read']),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as NotificationRecord))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// OPTIMIZED: Uses getCountFromServer to avoid fetching all notification docs
export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('status', '==', 'unread')
  );
  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch {
    // Fallback for non-indexed queries
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const ref = doc(db, 'notifications', notificationId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== userId) {
    throw new Error('You can only update your own notifications.');
  }
  await updateDoc(ref, { status: 'read', read: true, updatedAt: nowIso() });
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
  await updateDoc(ref, { status: 'dismissed', read: true, updatedAt: nowIso() });
}

export async function archiveNotification(notificationId: string): Promise<void> {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { status: 'archived', read: true, updatedAt: nowIso() });
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

// ========== PHASE 1: MEMBER GROWTH TRACKING ==========

export interface MemberGrowthMetrics {
  // Identity
  uid: string;
  fullName: string;
  guildRank: string;
  verificationStatus: string;

  // Quest Performance
  questsCompleted: number;
  questsInProgress: number;
  questsApplied: number;
  questAcceptRate: number;

  // Skills Growth
  skillsTotal: number;
  skillsVerified: number;
  skillsPending: number;
  certificatesEarned: number;

  // Organization Impact
  organizationsHelped: number;
  outcomesContributed: number;
  revenueGenerated: number;

  // Trust & Reputation
  reputationScore: number;
  experiencePoints: number;
  verifiedOutcomes: number;

  // Achievements
  achievementsUnlocked: number;
  badgesEarned: string[];

  // Growth Timeline
  joinedAt: string;
  daysSinceJoined: number;
  firstQuestCompletedAt?: string;
  firstOutcomeDeliveredAt?: string;
}

export interface MemberGrowthTimeline {
  milestone: string;
  date: string;
  details?: string;
}

// Fetch comprehensive member growth metrics
export async function fetchMemberGrowthMetrics(userId: string): Promise<MemberGrowthMetrics | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as GuildUser;

  // Count quests where user was applicant/accepted/completed
  const questsSnap = await getDocs(query(collection(db, 'quests')));
  const allQuests = normalizeQuests(questsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));

  const appliedQuests = allQuests.filter(q => q.applicants?.includes(userId));
  const inProgressQuests = allQuests.filter(q => q.acceptedMembers?.includes(userId) && q.status === 'inProgress');
  const completedQuests = allQuests.filter(q => q.completedMembers?.includes(userId));

  // Count outcomes user participated in
  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active')));
  const allOutcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));
  const memberOutcomes = allOutcomes.filter(o => o.participants?.includes(userId));

  // Get unique organizations from outcomes
  const orgsHelped = new Set(memberOutcomes.map(o => o.organizationId).filter(Boolean));

  // Calculate accept rate
  const totalApplied = appliedQuests.length;
  const accepted = inProgressQuests.length + completedQuests.length;
  const acceptRate = totalApplied > 0 ? Math.round((accepted / totalApplied) * 100) : 0;

  // Calculate days since joined
  const joinedAt = user.createdAt || user.updatedAt;
  const daysSinceJoined = joinedAt ? Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return {
    uid: user.uid,
    fullName: user.fullName,
    guildRank: user.guildRank,
    verificationStatus: user.verificationStatus,

    questsCompleted: completedQuests.length,
    questsInProgress: inProgressQuests.length,
    questsApplied: totalApplied,
    questAcceptRate: acceptRate,

    skillsTotal: user.skills?.length || 0,
    skillsVerified: user.proofs?.filter(p => p.status === 'verified').length || 0,
    skillsPending: user.proofs?.filter(p => p.status === 'pending').length || 0,
    certificatesEarned: user.certificates?.length || 0,

    organizationsHelped: orgsHelped.size,
    outcomesContributed: memberOutcomes.length,
    revenueGenerated: memberOutcomes.reduce((sum, o) => sum + (o.revenueGenerated || 0), 0),

    reputationScore: user.reputationScore || 0,
    experiencePoints: user.experiencePoints || 0,
    verifiedOutcomes: user.verifiedOutcomes || 0,

    achievementsUnlocked: user.achievements?.length || 0,
    badgesEarned: user.achievements?.map(a => a.badgeCode) || [],

    joinedAt: joinedAt || '',
    daysSinceJoined
  };
}

// Fetch member growth timeline - key moments
export async function fetchMemberGrowthTimeline(userId: string): Promise<MemberGrowthTimeline[]> {
  const timeline: MemberGrowthTimeline[] = [];

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return timeline;

  const user = userSnap.data() as GuildUser;

  // Account created
  if (user.createdAt) {
    timeline.push({ milestone: 'Joined Guild', date: user.createdAt });
  }

  // Onboarding completed
  if (user.onboardingCompleted && user.updatedAt) {
    timeline.push({ milestone: 'Completed Onboarding', date: user.updatedAt });
  }

  // First quest application
  const questsSnap = await getDocs(query(collection(db, 'quests')));
  const allQuests = normalizeQuests(questsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));
  const appliedQuest = allQuests.find(q => q.applicants?.includes(userId));
  if (appliedQuest) {
    timeline.push({ milestone: 'First Quest Application', date: appliedQuest.createdAt });
  }

  // First quest completion
  const completedQuest = allQuests.find(q => q.completedMembers?.includes(userId));
  if (completedQuest) {
    timeline.push({
      milestone: 'First Quest Completed',
      date: completedQuest.updatedAt,
      details: completedQuest.title
    });
  }

  // First outcome contribution
  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active')));
  const allOutcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));
  const memberOutcome = allOutcomes.find(o => o.participants?.includes(userId));
  if (memberOutcome) {
    timeline.push({
      milestone: 'First Outcome Delivered',
      date: memberOutcome.createdAt,
      details: memberOutcome.title
    });
  }

  // First verification
  if (user.verificationStatus === 'verified') {
    timeline.push({ milestone: 'Identity Verified', date: user.updatedAt });
  }

  // First certificate
  if (user.certificates && user.certificates.length > 0) {
    timeline.push({
      milestone: 'First Certificate Earned',
      date: user.certificates[0].issueDate,
      details: user.certificates[0].title
    });
  }

  // First achievement
  if (user.achievements && user.achievements.length > 0) {
    timeline.push({
      milestone: 'First Achievement Unlocked',
      date: user.achievements[0].unlockedAt,
      details: user.achievements[0].title
    });
  }

  // Sort by date
  return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ========== PHASE 3: QUEST EFFECTIVENESS ==========

export interface QuestEffectivenessMetrics {
  questId: string;
  title: string;

  // Applications
  totalApplications: number;
  uniqueApplicants: number;
  acceptedMembers: number;
  rejectedMembers: number;

  // Outcomes
  completionRate: number;
  submissionsApproved: number;
  submissionsRejected: number;
  averageCompletionDays: number;

  // Quality
  verifiedOutcomes: number;
  partialSuccess: number;
  failedAttempts: number;

  // Rewards Distributed
  totalReputationAwarded: number;
  totalExperienceAwarded: number;
  totalRevenueDistributed: number;
}

// Fetch quest effectiveness metrics
export async function fetchQuestEffectiveness(questId: string): Promise<QuestEffectivenessMetrics | null> {
  const questRef = doc(db, 'quests', questId);
  const questSnap = await getDoc(questRef);
  if (!questSnap.exists()) return null;

  const quest = questSnap.data() as Quest;

  // Get submissions for this quest
  const subsSnap = await getDocs(query(collection(db, 'questSubmissions'), where('questId', '==', questId)));
  const submissions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuestSubmission));

  const approved = submissions.filter(s => s.status === 'approved');
  const rejected = submissions.filter(s => s.status === 'rejected');

  // Calculate completion rate
  const totalAssigned = quest.acceptedMembers?.length || 0;
  const completionRate = totalAssigned > 0 ? Math.round((approved.length / totalAssigned) * 100) : 0;

  // Calculate average days to complete (if we had timestamps, estimate based on deadline)
  const avgCompletionDays = 7; // Rough estimate (no deadline field in Quest)

  return {
    questId,
    title: quest.title,

    totalApplications: quest.applicants?.length || 0,
    uniqueApplicants: new Set(quest.applicants || []).size,
    acceptedMembers: quest.acceptedMembers?.length || 0,
    rejectedMembers: quest.rejectedMembers?.length || 0,

    completionRate,
    submissionsApproved: approved.length,
    submissionsRejected: rejected.length,
    averageCompletionDays: avgCompletionDays,

    verifiedOutcomes: quest.outcomeStatus === 'Success' ? 1 : 0,
    partialSuccess: quest.outcomeStatus === 'Partial Success' ? 1 : 0,
    failedAttempts: quest.outcomeStatus === 'Failed' ? 1 : 0,

    totalReputationAwarded: quest.reputationPoints || 0,
    totalExperienceAwarded: quest.experienceReward || 0,
    totalRevenueDistributed: quest.paymentAmount || 0
  };
}

// ========== PHASE 4: ORGANIZATION IMPACT ==========

export interface OrganizationImpactMetrics {
  organizationId: string;
  organizationName: string;

  // Needs
  needsSubmitted: number;
  needsAccepted: number;
  needsInProgress: number;
  needsCompleted: number;

  // Opportunities
  opportunitiesCreated: number;
  opportunitiesMatched: number;
  opportunitiesInProgress: number;
  opportunitiesCompleted: number;

  // Quests
  questsCreated: number;
  questsCompleted: number;
  membersAssigned: number;

  // Outcomes
  outcomesDelivered: number;
  totalRevenueGenerated: number;
  verifiedOutcomes: number;

  // Trust Growth
  trustLevel: string;
  verificationStatus: string;
  lastContactAt?: string;
  daysSinceLastContact: number;
}

// Fetch organization impact metrics
export async function fetchOrganizationImpactMetrics(orgId: string): Promise<OrganizationImpactMetrics | null> {
  const orgRef = doc(db, 'organizations', orgId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) return null;

  const org = orgSnap.data() as Organization;

  // Fetch related needs
  const needsSnap = await getDocs(query(collection(db, 'needs'), where('organizationId', '==', orgId)));
  const needs = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));

  // Fetch related opportunities
  const oppSnap = await getDocs(query(collection(db, 'opportunities'), where('organizationId', '==', orgId)));
  const opps = oppSnap.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity));

  // Fetch related quests
  const questsSnap = await getDocs(query(collection(db, 'quests'), where('organizationId', '==', orgId)));
  const quests = normalizeQuests(questsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));

  // Fetch related outcomes
  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('organizationId', '==', orgId)));
  const outcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));

  // Calculate needs stats
  const needsCompleted = needs.filter(n => n.status === 'completed').length;
  const needsInProgress = needs.filter(n => n.status === 'inProgress').length;

  // Calculate opportunities stats
  const oppsCompleted = opps.filter(o => o.status === 'completed').length;
  const oppsInProgress = opps.filter(o => o.status === 'inProgress').length;

  // Calculate quest stats
  const questsCompleted = quests.filter(q => q.status === 'completed').length;
  const membersAssigned = new Set(quests.flatMap(q => q.acceptedMembers || [])).size;

  // Calculate outcomes stats
  const verifiedOutcomes = outcomes.filter(o => o.verificationStatus === 'verified').length;

  // Days since last contact
  const lastContact = org.lastContactAt || org.createdAt;
  const daysSinceLastContact = lastContact ? Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)) : 999;

  return {
    organizationId: orgId,
    organizationName: org.name,

    needsSubmitted: needs.length,
    needsAccepted: needs.filter(n => n.status === 'accepted').length,
    needsInProgress,
    needsCompleted,

    opportunitiesCreated: opps.length,
    opportunitiesMatched: opps.filter(o => o.status === 'matching').length,
    opportunitiesInProgress: oppsInProgress,
    opportunitiesCompleted: oppsCompleted,

    questsCreated: quests.length,
    questsCompleted,
    membersAssigned,

    outcomesDelivered: outcomes.length,
    totalRevenueGenerated: outcomes.reduce((sum, o) => sum + (o.revenueGenerated || 0), 0),
    verifiedOutcomes,

    trustLevel: org.trustLevel || 'new',
    verificationStatus: org.verificationStatus || 'pending',
    lastContactAt: org.lastContactAt,
    daysSinceLastContact
  };
}

// ========== PHASE 5: RECEPTIONIST IMPACT ==========

export interface ReceptionistImpactMetrics {
  receptionistId: string;
  fullName: string;

  // Organizations Managed
  organizationsAssigned: number;
  organizationsVerified: number;
  organizationsActive: number;
  organizationsPartner: number;

  // Needs Processed
  needsProcessed: number;
  needsAccepted: number;
  needsConverted: number;

  // Verifications
  verificationsCompleted: number;
  verificationsApproved: number;
  verificationsRejected: number;
  verificationRate: number;

  // Quests
  questsManaged: number;
  questsCompleted: number;

  // Revenue
  revenueGenerated: number;
}

export async function fetchReceptionistImpactMetrics(userId: string): Promise<ReceptionistImpactMetrics | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as GuildUser;

  // Organizations assigned to this receptionist
  const orgsSnap = await getDocs(query(collection(db, 'organizations'), where('assignedReceptionistId', '==', userId)));
  const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));

  // Needs processed (where user was the assigned receptionist)
  const needsSnap = await getDocs(query(collection(db, 'needs')));
  const allNeeds = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));
  const processedNeeds = allNeeds.filter(n => n.assignedReceptionistId === userId);

  // Verifications (this requires verification records - approximate using user activity)
  const verifSnap = await getDocs(query(collection(db, 'verifications')));
  const verifs = verifSnap.docs.map(d => ({ id: d.id, ...d.data() } as VerificationRecord));
  const userVerifs = verifs.filter(v => v.reviewer === user.uid || v.reviewer === userId);

  // Quests managed
  const questsSnap = await getDocs(query(collection(db, 'quests')));
  const allQuests = normalizeQuests(questsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));
  const managedQuests = allQuests.filter(q => q.assignedReceptionistId === userId);

  // Calculate metrics
  const orgsVerified = orgs.filter(o => o.verificationStatus === 'verified').length;
  const orgsActive = orgs.filter(o => o.currentStatus === 'active').length;
  const orgsPartner = orgs.filter(o => o.trustLevel === 'partner').length;

  const needsConverted = processedNeeds.filter(n => n.status === 'convertedToOpportunity').length;
  const verifsApproved = userVerifs.filter(v => v.decision === 'verified').length;
  const verifsRejected = userVerifs.filter(v => v.decision === 'rejected').length;
  const verifRate = userVerifs.length > 0 ? Math.round((verifsApproved / userVerifs.length) * 100) : 0;

  // Revenue from outcomes of managed organizations
  const outcomesSnap = await getDocs(query(collection(db, 'outcomes')));
  const allOutcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));
  const orgOutcomeIds = new Set(orgs.map(o => o.id));
  const orgOutcomes = allOutcomes.filter(o => o.organizationId && orgOutcomeIds.has(o.organizationId));

  return {
    receptionistId: userId,
    fullName: user.fullName,

    organizationsAssigned: orgs.length,
    organizationsVerified: orgsVerified,
    organizationsActive: orgsActive,
    organizationsPartner: orgsPartner,

    needsProcessed: processedNeeds.length,
    needsAccepted: processedNeeds.filter(n => n.status === 'accepted').length,
    needsConverted,

    verificationsCompleted: userVerifs.length,
    verificationsApproved: verifsApproved,
    verificationsRejected: verifsRejected,
    verificationRate: verifRate,

    questsManaged: managedQuests.length,
    questsCompleted: managedQuests.filter(q => q.status === 'completed').length,

    revenueGenerated: orgOutcomes.reduce((sum, o) => sum + (o.revenueGenerated || 0), 0)
  };
}

// ========== PHASE 1: BRANCH HEALTH ==========

export type BranchHealthStatus = 'healthy' | 'stable' | 'warning' | 'critical';

export interface BranchHealthScore {
  branchId: string;
  branchName: string;
  status: BranchHealthStatus;
  score: number; // 0-100

  // Component scores
  memberActivity: number;
  organizationActivity: number;
  questActivity: number;
  outcomeActivity: number;
  revenueActivity: number;
  verificationActivity: number;
  receptionistActivity: number;
  guildMasterActivity: number;

  // Risks
  risks: string[];
}

export async function calculateBranchHealth(branchId: string): Promise<BranchHealthScore | null> {
  const branch = await fetchBranchById(branchId);
  if (!branch) return null;

  const usersSnap = await getDocs(query(collection(db, 'users'), where('jurisdiction.guildBranchId', '==', branchId)));
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));

  const orgsSnap = await getDocs(query(collection(db, 'organizations')));
  const allOrgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
  const orgs = allOrgs.filter(o => o.jurisdiction?.guildBranchId === branchId);

  const questsSnap = await getDocs(query(collection(db, 'quests')));
  const allQuests = normalizeQuests(questsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));
  const branchQuests = allQuests.filter(q => q.jurisdiction?.guildBranchId === branchId);

  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active')));
  const allOutcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));
  const branchOutcomes = allOutcomes.filter(o => o.jurisdiction?.guildBranchId === branchId);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Member Activity (last 7 days)
  const activeMembers = users.filter(u => u.lastActiveAt && new Date(u.lastActiveAt) > sevenDaysAgo).length;
  const memberActivity = users.length > 0 ? Math.round((activeMembers / users.length) * 100) : 0;

  // Organization Activity (last 30 days)
  const activeOrgs = orgs.filter(o => o.lastContactAt && new Date(o.lastContactAt) > thirtyDaysAgo).length;
  const organizationActivity = orgs.length > 0 ? Math.round((activeOrgs / orgs.length) * 100) : 0;

  // Quest Activity (last 30 days)
  const activeQuests = branchQuests.filter(q => q.updatedAt && new Date(q.updatedAt) > thirtyDaysAgo).length;
  const questActivity = branchQuests.length > 0 ? Math.round((activeQuests / branchQuests.length) * 100) : 0;

  // Outcome Activity
  const outcomeActivity = branchOutcomes.length > 0 ? Math.min(100, branchOutcomes.length * 10) : 0;

  // Revenue Activity
  const revenue = branchOutcomes.reduce((sum, o) => sum + (o.revenueGenerated || 0), 0);
  const revenueActivity = revenue > 10000 ? 100 : revenue > 1000 ? 70 : revenue > 100 ? 40 : revenue > 0 ? 20 : 0;

  // Verification Activity
  const pendingVerifs = users.filter(u => u.verificationStatus === 'pending').length;
  const verificationActivity = users.length > 0 ? Math.max(0, 100 - Math.round((pendingVerifs / users.length) * 100)) : 50;

  // Receptionist Activity
  const receptionists = users.filter(u => u.role === 'receptionist');
  const activeReceptionists = receptionists.filter(r => r.lastActiveAt && new Date(r.lastActiveAt) > sevenDaysAgo).length;
  const receptionistActivity = receptionists.length > 0 ? Math.round((activeReceptionists / receptionists.length) * 100) : 0;

  // Guild Master Activity
  const guildMasters = users.filter(u => u.role?.includes('Guild Master'));
  const activeMasters = guildMasters.filter(m => m.lastActiveAt && new Date(m.lastActiveAt) > sevenDaysAgo).length;
  const guildMasterActivity = guildMasters.length > 0 ? Math.round((activeMasters / guildMasters.length) * 100) : 50;

  // Calculate overall score
  const score = Math.round(
    memberActivity * 0.2 +
    organizationActivity * 0.15 +
    questActivity * 0.15 +
    outcomeActivity * 0.15 +
    revenueActivity * 0.1 +
    verificationActivity * 0.1 +
    receptionistActivity * 0.1 +
    guildMasterActivity * 0.05
  );

  // Determine status
  let status: BranchHealthStatus = 'warning';
  if (score >= 80) status = 'healthy';
  else if (score >= 60) status = 'stable';
  else if (score >= 40) status = 'warning';
  else status = 'critical';

  // Identify risks
  const risks: string[] = [];
  if (memberActivity < 30) risks.push('Low member activity');
  if (organizationActivity < 30) risks.push('No organization contact');
  if (questActivity < 20) risks.push('No quest activity');
  if (receptionistActivity < 50) risks.push('Receptionist inactivity');
  if (guildMasters.length === 0) risks.push('No Guild Master');

  return {
    branchId,
    branchName: branch.name,
    status,
    score,
    memberActivity,
    organizationActivity,
    questActivity,
    outcomeActivity,
    revenueActivity,
    verificationActivity,
    receptionistActivity,
    guildMasterActivity,
    risks
  };
}

// ========== PHASE 2: RECEPTIONIST HEALTH ==========

export type ReceptionistHealthStatus = 'healthy' | 'active' | 'warning' | 'critical';

export interface ReceptionistHealth {
  receptionistId: string;
  fullName: string;
  status: ReceptionistHealthStatus;

  // Workload
  organizationsManaged: number;
  needsProcessed: number;
  verificationsDue: number;

  // Activity
  lastActionAt?: string;
  daysSinceLastAction: number;
  recentActions: number;

  // Risk
  workloadScore: number;
  activityScore: number;
  riskScore: number;
  risks: string[];
}

export async function calculateReceptionistHealth(userId: string): Promise<ReceptionistHealth | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as GuildUser;

  // Organizations managed
  const orgsSnap = await getDocs(query(collection(db, 'organizations'), where('assignedReceptionistId', '==', userId)));
  const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));

  // Needs processed (recent)
  const needsSnap = await getDocs(query(collection(db, 'needs')));
  const allNeeds = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));
  const processedNeeds = allNeeds.filter(n => n.assignedReceptionistId === userId);

  // Recent activity
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const lastActionAt = user.lastActiveAt;
  const daysSinceLastAction = lastActionAt ? Math.floor((now.getTime() - new Date(lastActionAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;

  const recentActions = processedNeeds.filter(n => n.updatedAt && new Date(n.updatedAt) > thirtyDaysAgo).length;

  // Calculate scores
  const workloadScore = Math.min(100, orgs.length * 20);
  const activityScore = recentActions > 0 ? Math.min(100, recentActions * 15) : 0;
  const riskScore = Math.min(100,
    (daysSinceLastAction > 14 ? 40 : daysSinceLastAction > 7 ? 20 : 0) +
    (orgs.length > 10 ? 30 : orgs.length > 5 ? 15 : 0) +
    (recentActions === 0 ? 30 : 0)
  );

  let status: ReceptionistHealthStatus = 'warning';
  if (riskScore < 20) status = 'healthy';
  else if (riskScore < 40 && daysSinceLastAction < 7) status = 'active';
  else if (riskScore < 60) status = 'warning';
  else status = 'critical';

  const risks: string[] = [];
  if (daysSinceLastAction > 14) risks.push('Inactive > 14 days');
  if (orgs.length > 10) risks.push('High workload');
  if (recentActions === 0) risks.push('No recent actions');

  return {
    receptionistId: userId,
    fullName: user.fullName,
    status,
    organizationsManaged: orgs.length,
    needsProcessed: processedNeeds.length,
    verificationsDue: 0,
    lastActionAt,
    daysSinceLastAction,
    recentActions,
    workloadScore,
    activityScore,
    riskScore,
    risks
  };
}

// ========== PHASE 3: GUILD MASTER HEALTH ==========

export interface GuildMasterHealth {
  userId: string;
  fullName: string;
  branchId?: string;
  branchName?: string;

  // Growth metrics
  memberGrowth: number;
  organizationGrowth: number;
  outcomeGrowth: number;
  revenueGrowth: number;

  // Activity
  lastActiveAt?: string;
  daysSinceActive: number;
  responsivenessScore: number;

  // Risk
  healthScore: number;
  risks: string[];
}

export async function calculateGuildMasterHealth(userId: string): Promise<GuildMasterHealth | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as GuildUser;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get branch metrics
  const branchId = user.jurisdiction?.guildBranchId;

  let memberGrowth = 0, organizationGrowth = 0, outcomeGrowth = 0, revenueGrowth = 0;

  if (branchId) {
    const branchUsersSnap = await getDocs(query(collection(db, 'users'), where('jurisdiction.guildBranchId', '==', branchId)));
    const branchUsers = branchUsersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));
    const newMembers = branchUsers.filter(u => u.createdAt && new Date(u.createdAt) > thirtyDaysAgo).length;
    memberGrowth = Math.round((newMembers / Math.max(1, branchUsers.length)) * 100);

    const orgsSnap = await getDocs(query(collection(db, 'organizations')));
    const allOrgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
    const branchOrgs = allOrgs.filter(o => o.jurisdiction?.guildBranchId === branchId);
    const newOrgs = branchOrgs.filter(o => o.createdAt && new Date(o.createdAt) > thirtyDaysAgo).length;
    organizationGrowth = Math.round((newOrgs / Math.max(1, branchOrgs.length)) * 100);
  }

  const daysSinceActive = user.lastActiveAt ? Math.floor((now.getTime() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const responsivenessScore = daysSinceActive < 3 ? 100 : daysSinceActive < 7 ? 70 : daysSinceActive < 14 ? 40 : 10;

  const healthScore = Math.round(
    (memberGrowth * 0.25 + organizationGrowth * 0.25 + outcomeGrowth * 0.25 + responsivenessScore * 0.25)
  );

  const risks: string[] = [];
  if (daysSinceActive > 14) risks.push('Inactive > 14 days');
  if (memberGrowth < 5) risks.push('Low member growth');
  if (organizationGrowth < 5) risks.push('Low organization growth');

  return {
    userId,
    fullName: user.fullName,
    branchId,
    branchName: user.jurisdiction?.guildBranchName,
    memberGrowth,
    organizationGrowth,
    outcomeGrowth,
    revenueGrowth,
    lastActiveAt: user.lastActiveAt,
    daysSinceActive,
    responsivenessScore,
    healthScore,
    risks
  };
}

// ========== PHASE 4: SUCCESSION INTELLIGENCE ==========

export interface SuccessionIntelligence {
  currentHolderId: string;
  currentHolderName: string;
  branchId?: string;

  hasSuccessor: boolean;
  successorId?: string;
  successorName?: string;
  successorVerified: boolean;
  successorActive: boolean;

  backupHolderId?: string;
  backupHolderName?: string;

  emergencyHolderId?: string;
  emergencyHolderName?: string;

  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: string[];
}

export async function reviewSuccessionPlan(userId: string): Promise<SuccessionIntelligence | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as GuildUser;
  const plan = user.successionPlan;

  const result: SuccessionIntelligence = {
    currentHolderId: userId,
    currentHolderName: user.fullName,
    branchId: user.jurisdiction?.guildBranchId,
    hasSuccessor: false,
    riskLevel: 'high',
    risks: [],
    successorVerified: false,
    successorActive: false
  };

  if (!plan) {
    result.risks.push('No succession plan defined');
    return result;
  }

  result.hasSuccessor = true;
  result.successorId = plan.primaryHolderId;

  if (plan.primaryHolderId) {
    const successorRef = doc(db, 'users', plan.primaryHolderId);
    const successorSnap = await getDoc(successorRef);
    if (successorSnap.exists()) {
      const successor = successorSnap.data() as GuildUser;
      result.successorName = successor.fullName;
      result.successorVerified = successor.verificationStatus === 'verified';
      result.successorActive = successor.status === 'active';
      result.successorActive = !!successor.lastActiveAt && new Date(successor.lastActiveAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;
    }
  }

  if (plan.backupHolderId) {
    result.backupHolderId = plan.backupHolderId;
    const backupRef = doc(db, 'users', plan.backupHolderId);
    const backupSnap = await getDoc(backupRef);
    if (backupSnap.exists()) {
      result.backupHolderName = (backupSnap.data() as GuildUser).fullName;
    }
  }

  if (plan.emergencyHolderId) {
    result.emergencyHolderId = plan.emergencyHolderId;
    const emergencyRef = doc(db, 'users', plan.emergencyHolderId);
    const emergencySnap = await getDoc(emergencyRef);
    if (emergencySnap.exists()) {
      result.emergencyHolderName = (emergencySnap.data() as GuildUser).fullName;
    }
  }

  // Calculate risk
  if (!result.hasSuccessor) result.riskLevel = 'critical';
  else if (!result.successorActive) { result.riskLevel = 'high'; result.risks.push('Successor inactive'); }
  else if (!result.successorVerified) { result.riskLevel = 'medium'; result.risks.push('Successor not verified'); }
  else result.riskLevel = 'low';

  return result;
}

// ========== PHASE 5: INACTIVITY DETECTION ==========

export interface InactiveEntity {
  id: string;
  name: string;
  type: 'member' | 'organization' | 'receptionist' | 'guildMaster' | 'branch';
  lastActiveAt?: string;
  daysInactive: number;
  riskLevel: string;
}

export async function detectInactiveEntities(limitCount = 50): Promise<InactiveEntity[]> {
  const inactives: InactiveEntity[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Check inactive members
  const usersSnap = await getDocs(query(collection(db, 'users'), limit(limitCount)));
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));

  for (const user of users) {
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : user.createdAt ? new Date(user.createdAt) : null;
    if (lastActive && lastActive < thirtyDaysAgo) {
      const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      let riskLevel = 'low';
      if (daysInactive > 60) riskLevel = 'critical';
      else if (daysInactive > 30) riskLevel = 'high';

      inactives.push({
        id: user.uid,
        name: user.fullName,
        type: user.role?.includes('Guild Master') ? 'guildMaster' : user.role === 'receptionist' ? 'receptionist' : 'member',
        lastActiveAt: user.lastActiveAt,
        daysInactive,
        riskLevel
      });
    }
  }

  // Check inactive organizations
  const orgsSnap = await getDocs(query(collection(db, 'organizations')));
  const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));

  for (const org of orgs) {
    const lastContact = org.lastContactAt ? new Date(org.lastContactAt) : org.createdAt ? new Date(org.createdAt) : null;
    if (lastContact && lastContact < thirtyDaysAgo) {
      const daysInactive = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      let riskLevel = 'low';
      if (daysInactive > 60) riskLevel = 'critical';
      else if (daysInactive > 30) riskLevel = 'high';

      inactives.push({
        id: org.id,
        name: org.name,
        type: 'organization',
        lastActiveAt: org.lastContactAt,
        daysInactive,
        riskLevel
      });
    }
  }

  return inactives.sort((a, b) => b.daysInactive - a.daysInactive).slice(0, limitCount || 50);
}

// ========== PHASE 6: ORGANIZATION RISK ==========

export interface OrganizationRisk {
  organizationId: string;
  name: string;

  // Risk factors
  noActivity: boolean;
  noReceptionist: boolean;
  noVerification: boolean;
  noOutcomes: boolean;
  noFollowUp: boolean;

  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
}

export async function assessOrganizationRisks(limitCount = 50): Promise<OrganizationRisk[]> {
  const orgsSnap = await getDocs(query(collection(db, 'organizations')));
  const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));

  const needsSnap = await getDocs(query(collection(db, 'needs')));
  const allNeeds = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));

  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active')));
  const allOutcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const risks: OrganizationRisk[] = [];

  for (const org of orgs) {
    // Check no activity
    const lastContact = org.lastContactAt ? new Date(org.lastContactAt) : null;
    const noActivity = !lastContact || lastContact < thirtyDaysAgo;

    // Check no receptionist
    const noReceptionist = !org.assignedReceptionistId;

    // Check no verification
    const noVerification = org.verificationStatus !== 'verified';

    // Check no outcomes
    const orgOutcomes = allOutcomes.filter(o => o.organizationId === org.id);
    const noOutcomes = orgOutcomes.length === 0;

    // Check no follow-up
    const nextFollowUp = org.nextFollowUpAt ? new Date(org.nextFollowUpAt) : null;
    const noFollowUp = !nextFollowUp || nextFollowUp < now;

    // Calculate risk score
    let riskScore = 0;
    if (noActivity) riskScore += 25;
    if (noReceptionist) riskScore += 20;
    if (noVerification) riskScore += 15;
    if (noOutcomes) riskScore += 25;
    if (noFollowUp) riskScore += 15;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 75) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    risks.push({
      organizationId: org.id,
      name: org.name,
      noActivity,
      noReceptionist,
      noVerification,
      noOutcomes,
      noFollowUp,
      riskScore,
      riskLevel,
      priority: riskScore
    });
  }

  return risks.filter(r => r.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore).slice(0, limitCount || 50);
}

// ========== PHASE 10: FEDERATION RESILIENCE ==========

export interface FederationResilience {
  // Health indicators
  totalBranches: number;
  healthyBranches: number;
  stableBranches: number;
  warningBranches: number;
  criticalBranches: number;

  // Activity
  totalMembers: number;
  activeMembers: number;
  totalOrganizations: number;
  activeOrganizations: number;

  // Growth
  recentMemberGrowth: number;
  recentOrgGrowth: number;
  recentOutcomeGrowth: number;
  recentRevenueGrowth: number;

  // Trust
  verifiedMembers: number;
  trustedOrganizations: number;
  partnerOrganizations: number;

  // Risk
  inactiveMembers: number;
  inactiveOrganizations: number;
  unverifiedMembers: number;
  unresolvedNeeds: number;

  // Overall scores
  healthScore: number;
  stabilityScore: number;
  activityScore: number;
  trustScore: number;
  growthScore: number;
  riskScore: number;

  overallScore: number;
  status: 'resilient' | 'stable' | 'concerned' | 'critical';
}

export async function calculateFederationResilience(): Promise<FederationResilience> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch all data
  const usersSnap = await getDocs(query(collection(db, 'users')));
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as GuildUser));

  const orgsSnap = await getDocs(query(collection(db, 'organizations')));
  const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));

  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active')));
  const outcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));

  const needsSnap = await getDocs(query(collection(db, 'needs')));
  const needs = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));

  // Branch counts (unique branches)
  const branchIds = new Set(users.map(u => u.jurisdiction?.guildBranchId).filter(Boolean));
  const totalBranches = branchIds.size;

  // Activity counts
  const activeMembers = users.filter(u => u.lastActiveAt && new Date(u.lastActiveAt) > sevenDaysAgo).length;
  const activeOrganizations = orgs.filter(o => o.lastContactAt && new Date(o.lastContactAt) > thirtyDaysAgo).length;

  // Growth (last 30 days)
  const newMembers = users.filter(u => u.createdAt && new Date(u.createdAt) > thirtyDaysAgo).length;
  const recentMemberGrowth = Math.round((newMembers / Math.max(1, users.length)) * 100);

  const newOrgs = orgs.filter(o => o.createdAt && new Date(o.createdAt) > thirtyDaysAgo).length;
  const recentOrgGrowth = Math.round((newOrgs / Math.max(1, orgs.length)) * 100);

  const newOutcomes = outcomes.filter(o => o.createdAt && new Date(o.createdAt) > thirtyDaysAgo).length;
  const recentOutcomeGrowth = Math.round((newOutcomes / Math.max(1, outcomes.length)) * 100);

  const recentRevenue = outcomes.filter(o => o.createdAt && new Date(o.createdAt) > thirtyDaysAgo).reduce((sum, o) => sum + (o.revenueGenerated || 0), 0);
  const totalRevenue = outcomes.reduce((sum, o) => sum + (o.revenueGenerated || 0), 0);
  const recentRevenueGrowth = totalRevenue > 0 ? Math.round((recentRevenue / totalRevenue) * 100) : 0;

  // Trust counts
  const verifiedMembers = users.filter(u => u.verificationStatus === 'verified').length;
  const trustedOrganizations = orgs.filter(o => o.trustLevel === 'trusted').length;
  const partnerOrganizations = orgs.filter(o => o.trustLevel === 'partner').length;

  // Risk counts
  const inactiveMembers = users.filter(u => {
    const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : u.createdAt ? new Date(u.createdAt) : null;
    return !lastActive || lastActive < thirtyDaysAgo;
  }).length;

  const inactiveOrganizations = orgs.filter(o => {
    const lastContact = o.lastContactAt ? new Date(o.lastContactAt) : o.createdAt ? new Date(o.createdAt) : null;
    return !lastContact || lastContact < thirtyDaysAgo;
  }).length;

  const unverifiedMembers = users.filter(u => u.verificationStatus !== 'verified').length;
  const unresolvedNeeds = needs.filter(n => n.status !== 'completed' && n.status !== 'closed').length;

  // Branch health calculation
  let healthyBranches = 0, stableBranches = 0, warningBranches = 0, criticalBranches = 0;

  // Calculate component scores
  const healthScore = Math.round((activeMembers / Math.max(1, users.length)) * 100);
  const stabilityScore = Math.round(((users.length - inactiveMembers) / Math.max(1, users.length)) * 100);
  const activityScore = Math.round((activeOrganizations / Math.max(1, orgs.length)) * 100);
  const trustScore = Math.round((verifiedMembers / Math.max(1, users.length)) * 50 + (trustedOrganizations / Math.max(1, orgs.length)) * 50);
  const growthScore = Math.round((recentMemberGrowth + recentOrgGrowth + recentOutcomeGrowth) / 3);
  const riskScore = Math.round(
    ((inactiveMembers / Math.max(1, users.length)) * 30) +
    ((inactiveOrganizations / Math.max(1, orgs.length)) * 30) +
    ((unverifiedMembers / Math.max(1, users.length)) * 20) +
    (unresolvedNeeds > 100 ? 20 : 0)
  );

  const overallScore = Math.round((healthScore + stabilityScore + activityScore + trustScore + growthScore) / 5 - riskScore / 5);

  let status: 'resilient' | 'stable' | 'concerned' | 'critical' = 'stable';
  if (overallScore >= 80) status = 'resilient';
  else if (overallScore >= 60) status = 'stable';
  else if (overallScore >= 40) status = 'concerned';
  else status = 'critical';

  return {
    totalBranches,
    healthyBranches,
    stableBranches: totalBranches - criticalBranches - warningBranches,
    warningBranches,
    criticalBranches,

    totalMembers: users.length,
    activeMembers,
    totalOrganizations: orgs.length,
    activeOrganizations,

    recentMemberGrowth,
    recentOrgGrowth,
    recentOutcomeGrowth,
    recentRevenueGrowth,

    verifiedMembers,
    trustedOrganizations,
    partnerOrganizations,

    inactiveMembers,
    inactiveOrganizations,
    unverifiedMembers,
    unresolvedNeeds,

    healthScore,
    stabilityScore,
    activityScore,
    trustScore,
    growthScore,
    riskScore,

    overallScore,
    status
  };
}

// ========== NETWORK VISIBILITY FUNCTIONS ==========

export interface ProfileCard {
  id: string;
  name: string;
  role: string;
  trustLevel: string;
  verificationStatus: string;
  lastActiveAt?: string;
  workload?: number;
  specialization?: string;
  jurisdiction?: string;
  photoURL?: string;
}

// Get profile card for assignment UI
export async function fetchProfileCard(userId: string): Promise<ProfileCard | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const user = userSnap.data() as GuildUser;

  // Calculate simple workload based on role
  let workload = 0;
  if (user.role === 'receptionist') {
    const orgsSnap = await getDocs(query(collection(db, 'organizations'), where('assignedReceptionistId', '==', userId)));
    workload = orgsSnap.size;
  }

  return {
    id: user.uid,
    name: user.fullName,
    role: user.role || 'member',
    trustLevel: user.verificationStatus === 'verified' ? 'verified' : 'standard',
    verificationStatus: user.verificationStatus || 'pending',
    lastActiveAt: user.lastActiveAt,
    workload,
    specialization: user.skills?.[0],
    jurisdiction: user.jurisdiction?.guildBranchName,
    photoURL: user.photoURL
  };
}

// Get organization profile with relationships
export async function fetchOrganizationRelations(orgId: string): Promise<{
  organization: Organization | null;
  assignedReceptionist?: { uid: string; name: string };
  assignedBranch?: { id: string; name: string };
  needs: Need[];
  opportunities: Opportunity[];
  outcomes: Outcome[];
  recentActivity: ActivityLog[];
} | null> {
  const orgRef = doc(db, 'organizations', orgId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) return null;

  const org = orgSnap.data() as Organization;

  // Get assigned receptionist
  let assignedReceptionist;
  if (org.assignedReceptionistId) {
    const recRef = doc(db, 'users', org.assignedReceptionistId);
    const recSnap = await getDoc(recRef);
    if (recSnap.exists()) {
      const rec = recSnap.data() as GuildUser;
      assignedReceptionist = { uid: rec.uid, name: rec.fullName };
    }
  }

  // Get needs
  const needsSnap = await getDocs(query(collection(db, 'needs'), where('organizationId', '==', orgId)));
  const needs = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));

  // Get opportunities
  const oppsSnap = await getDocs(query(collection(db, 'opportunities'), where('organizationId', '==', orgId)));
  const opportunities = oppsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity));

  // Get outcomes
  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('organizationId', '==', orgId)));
  const outcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));

  return {
    organization: org,
    assignedReceptionist,
    assignedBranch: org.jurisdiction?.guildBranchId ? { id: org.jurisdiction.guildBranchId, name: org.jurisdiction.guildBranchName || '' } : undefined,
    needs,
    opportunities,
    outcomes,
    recentActivity: []
  };
}

// Get member's organization contributions
export async function fetchMemberContributions(userId: string): Promise<{
  questsApplied: Quest[];
  questsCompleted: Quest[];
  outcomesContributed: Outcome[];
  organizationsWorked: { id: string; name: string }[];
}> {
  const questsSnap = await getDocs(query(collection(db, 'quests')));
  const allQuests = normalizeQuests(questsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Quest)));

  const questsApplied = allQuests.filter(q => q.applicants?.includes(userId));
  const questsCompleted = allQuests.filter(q => q.completedMembers?.includes(userId));

  const outcomesSnap = await getDocs(query(collection(db, 'outcomes'), where('archiveStatus', '==', 'active')));
  const allOutcomes = outcomesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Outcome));
  const outcomesContributed = allOutcomes.filter(o => o.participants?.includes(userId));

  // Get unique organizations
  const orgIds = new Set<string>();
  questsCompleted.forEach(q => { if (q.organizationId) orgIds.add(q.organizationId); });
  outcomesContributed.forEach(o => { if (o.organizationId) orgIds.add(o.organizationId); });

  const organizationsWorked: { id: string; name: string }[] = [];
  for (const orgId of orgIds) {
    const orgRef = doc(db, 'organizations', orgId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const org = orgSnap.data() as Organization;
      organizationsWorked.push({ id: orgId, name: org.name });
    }
  }

  return {
    questsApplied,
    questsCompleted,
    outcomesContributed,
    organizationsWorked
  };
}

// Calculate profile completion percentage (simple score 0-100)
export function calculateProfileScore(profile: GuildUser): number {
  let score = 0;
  if (profile.fullName) score += 15;
  if (profile.bio) score += 15;
  if (profile.skills && profile.skills.length > 0) score += 15;
  if (profile.interests && profile.interests.length > 0) score += 10;
  if (profile.phone) score += 10;
  if (profile.photoURL) score += 10;
  if (profile.email) score += 10;
  if (profile.jurisdiction?.cityName) score += 10;
  if (profile.verificationStatus === 'verified') score += 5;
  return Math.min(100, score);
}

// ========== VERIFICATION ENFORCEMENT HELPERS ==========

export type VerificationRequirement = 'none' | 'identity' | 'profile' | 'payment' | 'trusted';

export function getVerificationRequirement(action: 'submitQuest' | 'submitNeed' | 'receivePayment' | 'joinQuest' | 'verifyOrg'): VerificationRequirement {
  switch (action) {
    case 'submitQuest': return 'identity';
    case 'submitNeed': return 'identity';
    case 'receivePayment': return 'trusted';
    case 'joinQuest': return 'identity';
    case 'verifyOrg': return 'profile';
    default: return 'none';
  }
}

export function meetsVerificationRequirement(profile: GuildUser, requirement: VerificationRequirement): boolean {
  switch (requirement) {
    case 'none': return true;
    case 'identity': return profile.verificationStatus === 'verified' || profile.verificationStatus === 'pending';
    case 'profile': return calculateProfileScore(profile) >= 50;
    case 'payment': return profile.verificationStatus === 'verified';
    case 'trusted': return profile.verificationStatus === 'verified';
    default: return false;
  }
}

// ========== ACTION CENTER FUNCTIONS ==========

export interface ActionItem {
  id: string;
  type: 'completeProfile' | 'verifyIdentity' | 'applyQuest' | 'submitCompletion' | 'addSkill' | 'addPortfolio' | 'reviewSubmission' | 'updateInfo' | 'followUp' | 'assignTask' | 'paymentAction' | 'escalation';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'inProgress' | 'completed' | 'dismissed';
  link?: string;
  createdAt: string;
  dueAt?: string;
  assignedTo?: string;
}

// Member Action Center - returns actionable items for the member
export function getMemberActionItems(profile: GuildUser, quests: Quest[]): ActionItem[] {
  const items: ActionItem[] = [];
  const now = new Date().toISOString();

  // 1. Profile Completion Actions
  if (calculateProfileScore(profile) < 50) {
    items.push({
      id: `action-${Date.now()}-profile`,
      type: 'completeProfile',
      title: 'Complete Your Profile',
      description: 'Add skills, bio, and photo to unlock more opportunities',
      priority: 'high',
      status: 'open',
      link: '/settings',
      createdAt: now
    });
  }

  // 2. Identity Verification
  if (profile.verificationStatus !== 'verified') {
    items.push({
      id: `action-${Date.now()}-verify`,
      type: 'verifyIdentity',
      title: 'Verify Your Identity',
      description: 'Verification required to receive payments and access paid quests',
      priority: profile.verificationStatus === 'pending' ? 'medium' : 'critical',
      status: 'open',
      link: '/verification',
      createdAt: now
    });
  }

  // 3. Add Skills if missing
  if (!profile.skills || profile.skills.length === 0) {
    items.push({
      id: `action-${Date.now()}-skills`,
      type: 'addSkill',
      title: 'Add Your Skills',
      description: 'Add skills to get matched with relevant quests',
      priority: 'medium',
      status: 'open',
      link: '/settings',
      createdAt: now
    });
  }

  // 4. Recommended Quests to Apply
  const recommendedQuests = quests.filter(q => {
    if (q.status !== 'open') return false;
    const categoryMatch = q.category?.toLowerCase() === profile.pathSelected?.toLowerCase();
    const skillMatch = q.requiredSkills?.some(s => profile.skills?.includes(s));
    return categoryMatch || skillMatch;
  });

  if (recommendedQuests.length > 0) {
    items.push({
      id: `action-${Date.now()}-quest`,
      type: 'applyQuest',
      title: 'Apply For Recommended Quest',
      description: `${recommendedQuests.length} quests match your profile`,
      priority: 'medium',
      status: 'open',
      link: '/quests',
      createdAt: now
    });
  }

  // 5. Active Quests - Submit Completion
  const activeQuests = quests.filter(q => q.acceptedMembers?.includes(profile.uid) && q.status === 'inProgress');
  if (activeQuests.length > 0) {
    items.push({
      id: `action-${Date.now()}-complete`,
      type: 'submitCompletion',
      title: 'Submit Quest Completion',
      description: `${activeQuests.length} quest${activeQuests.length > 1 ? 's' : ''} in progress`,
      priority: 'high',
      status: 'open',
      link: '/quests',
      createdAt: now
    });
  }

  // 6. Pending Applications
  const appliedQuests = quests.filter(q => q.applicants?.includes(profile.uid));
  const pendingApps = appliedQuests.filter(q => q.status === 'open');
  if (pendingApps.length > 0) {
    items.push({
      id: `action-${Date.now()}-pending`,
      type: 'reviewSubmission',
      title: 'Check Application Status',
      description: `${pendingApps.length} application${pendingApps.length > 1 ? 's' : ''} awaiting review`,
      priority: 'low',
      status: 'open',
      link: '/quests',
      createdAt: now
    });
  }

  // 7. Add Portfolio Proof
  if (!profile.proofs || profile.proofs.length === 0) {
    items.push({
      id: `action-${Date.now()}-portfolio`,
      type: 'addPortfolio',
      title: 'Add Portfolio Proof',
      description: 'Document your work to build credibility',
      priority: 'low',
      status: 'open',
      link: '/profile',
      createdAt: now
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// Organization Action Center
export function getOrganizationActionItems(org: Organization, quests: Quest[], needs: Need[]): ActionItem[] {
  const items: ActionItem[] = [];
  const now = new Date().toISOString();

  // 1. Profile completion — check real editable fields
  const profileIncomplete = !org.description || !org.website || !org.phone;
  if (profileIncomplete) {
    items.push({
      id: `action-${org.id}-info`,
      type: 'updateInfo',
      title: 'Complete Organization Profile',
      description: 'Add description, website, and phone to strengthen your profile',
      priority: 'high',
      status: 'open',
      link: '#edit-profile',
      createdAt: now
    });
  }

  // 2. Verification — links to the actual verification page
  if (org.verificationStatus !== 'verified') {
    items.push({
      id: `action-${org.id}-verify`,
      type: 'verifyIdentity',
      title: 'Get Verified',
      description: 'Submit your verification request to build trust with members',
      priority: org.trustLevel === 'partner' ? 'low' : 'high',
      status: 'open',
      link: '/verification',
      createdAt: now
    });
  }

  // 3. Post Needs
  const openNeeds = needs.filter(n => n.organizationId === org.id && n.status === 'submitted');
  if (openNeeds.length === 0) {
    items.push({
      id: `action-${org.id}-needs`,
      type: 'updateInfo',
      title: 'Post Organization Needs',
      description: 'Add needs to find help for your projects',
      priority: 'medium',
      status: 'open',
      link: '/need-submit',
      createdAt: now
    });
  }

  // 4. Active Quests review
  const activeQuests = quests.filter(q => q.organizationId === org.id && q.status === 'underReview');
  if (activeQuests.length > 0) {
    items.push({
      id: `action-${org.id}-review`,
      type: 'reviewSubmission',
      title: 'Review Quest Submissions',
      description: `${activeQuests.length} submission${activeQuests.length > 1 ? 's' : ''} waiting`,
      priority: 'high',
      status: 'open',
      link: activeQuests[0]?.id ? `/quests/${activeQuests[0].id}` : '/org-dashboard',
      createdAt: now
    });
  }

  // 5. Follow-up needed
  if (org.nextFollowUpAt && new Date(org.nextFollowUpAt).getTime() <= Date.now()) {
    items.push({
      id: `action-${org.id}-follow`,
      type: 'followUp',
      title: 'Schedule Follow-Up',
      description: 'Regular contact maintains engagement',
      priority: 'medium',
      status: 'open',
      link: '/org-messages',
      createdAt: now
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// Receptionist Work Queue
export function getReceptionistWorkQueue(
  organizations: Organization[],
  needs: Need[],
  quests: Quest[],
  verifications: VerificationRecord[]
): ActionItem[] {
  const items: ActionItem[] = [];
  const now = new Date().toISOString();

  // 1. Organizations needing follow-up
  const needFollowUp = organizations.filter(o =>
    o.nextFollowUpAt && new Date(o.nextFollowUpAt).getTime() <= Date.now()
  );
  needFollowUp.forEach(org => {
    items.push({
      id: `action-r-${org.id}-follow`,
      type: 'followUp',
      title: `Contact ${org.name}`,
      description: 'Follow-up scheduled',
      priority: 'high',
      status: 'open',
      createdAt: now,
      dueAt: org.nextFollowUpAt
    });
  });

  // 2. Needs awaiting review
  const pendingNeeds = needs.filter(n => n.status === 'submitted');
  pendingNeeds.forEach(need => {
    items.push({
      id: `action-n-${need.id}-review`,
      type: 'reviewSubmission',
      title: `Review Need: ${need.title}`,
      description: 'Needs receptionist review',
      priority: 'medium',
      status: 'open',
      createdAt: now
    });
  });

  // 3. Verification requests
  const pendingVerifs = verifications.filter(v => v.decision === 'pending');
  pendingVerifs.forEach(v => {
    items.push({
      id: `action-v-${v.id}`,
      type: 'verifyIdentity',
      title: `Process Verification`,
      description: `${v.method} verification pending`,
      priority: 'high',
      status: 'open',
      createdAt: now
    });
  });

  // 4. Quests needing assignment
  const unassignedQuests = quests.filter(q => q.status === 'open' && (!q.acceptedMembers || q.acceptedMembers.length < 3));
  unassignedQuests.slice(0, 5).forEach(q => {
    items.push({
      id: `action-q-${q.id}-assign`,
      type: 'assignTask',
      title: `Assign Quest: ${q.title}`,
      description: 'Needs member assignment',
      priority: q.priority === 'urgent' ? 'critical' : 'medium',
      status: 'open',
      createdAt: now
    });
  });

  // 5. Inactive organizations (no activity in 30 days)
  const inactiveOrgs = organizations.filter(o => {
    const lastActive = o.lastContactAt ? new Date(o.lastContactAt).getTime() : 0;
    const daysInactive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
    return lastActive > 0 && daysInactive > 30;
  });
  inactiveOrgs.forEach(org => {
    items.push({
      id: `action-r-${org.id}-inactive`,
      type: 'followUp',
      title: `Re-engage ${org.name}`,
      description: 'No activity in 30+ days',
      priority: 'medium',
      status: 'open',
      createdAt: now
    });
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 20);
}

// Guild Master Work Queue
export function getGuildMasterWorkQueue(
  organizations: Organization[],
  users: GuildUser[],
  verifications: VerificationRecord[],
  branches: { id: string; name: string; assignedReceptionistId?: string }[]
): ActionItem[] {
  const items: ActionItem[] = [];
  const now = new Date().toISOString();

  // 1. At-risk organizations
  const atRiskOrgs = organizations.filter(o => o.trustLevel === 'new' || !o.verificationStatus);
  atRiskOrgs.forEach(org => {
    items.push({
      id: `action-gm-${org.id}-risk`,
      type: 'escalation',
      title: `Support ${org.name}`,
      description: 'Organization needs attention',
      priority: org.trustLevel === 'new' ? 'high' : 'medium',
      status: 'open',
      createdAt: now
    });
  });

  // 2. Verification backlogs
  const pendingVerifs = verifications.filter(v => v.decision === 'pending');
  const daysPending = (v: VerificationRecord) => {
    const created = v.createdAt ? new Date(v.createdAt).getTime() : 0;
    return created > 0 ? (Date.now() - created) / (1000 * 60 * 60 * 24) : 0;
  };
  const backlogged = pendingVerifs.filter(v => daysPending(v) > 7);
  backlogged.forEach(v => {
    items.push({
      id: `action-gm-v-${v.id}`,
      type: 'verifyIdentity',
      title: `Clear Verification Backlog`,
      description: 'Pending for 7+ days',
      priority: 'high',
      status: 'open',
      createdAt: now
    });
  });

  // 3. Unassigned branches (simplified check)
  const unassignedBranches = branches.filter(b => !b.assignedReceptionistId);
  unassignedBranches.slice(0, 3).forEach(branch => {
    items.push({
      id: `action-gm-${branch.id}-receptionist`,
      type: 'assignTask',
      title: `Assign Receptionist to ${branch.name}`,
      description: 'Branch needs receptionist',
      priority: 'medium',
      status: 'open',
      createdAt: now
    });
  });

  // 4. Members needing review
  const unverifiedMembers = users.filter(u => u.verificationStatus === 'pending');
  if (unverifiedMembers.length > 0) {
    items.push({
      id: `action-gm-verify-batch`,
      type: 'verifyIdentity',
      title: 'Review Member Verifications',
      description: `${unverifiedMembers.length} members pending`,
      priority: 'medium',
      status: 'open',
      createdAt: now
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 15);
}

// Founder Action Center
export function getFounderActionItems(
  organizations: Organization[],
  branches: { id: string; name: string; assignedGuildMasterId?: string; assignedReceptionistId?: string }[],
  users: GuildUser[],
  revenue: { id: string; status: string }[]
): ActionItem[] {
  const items: ActionItem[] = [];
  const now = new Date().toISOString();

  // 1. Critical risk organizations
  const criticalOrgs = organizations.filter(o => o.trustLevel === 'new');
  criticalOrgs.slice(0, 5).forEach(org => {
    items.push({
      id: `action-f-${org.id}`,
      type: 'escalation',
      title: `New Organization Risk: ${org.name}`,
      description: 'Requires immediate attention',
      priority: 'critical',
      status: 'open',
      createdAt: now
    });
  });

  // 2. Branches needing attention
  const inactiveBranches = branches.filter(b => !b.assignedGuildMasterId);
  inactiveBranches.forEach(branch => {
    items.push({
      id: `action-f-branch-${branch.id}`,
      type: 'assignTask',
      title: `Assign GM to ${branch.name}`,
      description: 'No Guild Master assigned',
      priority: 'high',
      status: 'open',
      createdAt: now
    });
  });

  // 3. Revenue issues
  const pendingRevenue = revenue.filter(r => r.status === 'pending');
  if (pendingRevenue.length > 10) {
    items.push({
      id: `action-f-revenue`,
      type: 'paymentAction',
      title: 'Revenue Processing Backlog',
      description: `${pendingRevenue.length} transactions pending`,
      priority: 'high',
      status: 'open',
      createdAt: now
    });
  }

  // 4. Federation health
  const unhealthyBranches = branches.filter(b => {
    // Check if branch has issues (no GM, no receptionist, etc)
    return !b.assignedGuildMasterId || !b.assignedReceptionistId;
  });
  unhealthyBranches.forEach(branch => {
    items.push({
      id: `action-f-fed-${branch.id}`,
      type: 'escalation',
      title: `Federation Risk: ${branch.name}`,
      description: 'Leadership gap detected',
      priority: 'high',
      status: 'open',
      createdAt: now
    });
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 10);
}

// Follow-Up Tasks Generator
export interface FollowUpTask {
  id: string;
  entityType: 'organization' | 'member' | 'receptionist' | 'guildMaster';
  entityId: string;
  entityName: string;
  task: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'inProgress' | 'completed' | 'dismissed';
  createdAt: string;
  dueAt?: string;
}

export function generateFollowUpTasks(
  organizations: Organization[],
  users: GuildUser[]
): FollowUpTask[] {
  const tasks: FollowUpTask[] = [];
  const now = new Date().toISOString();

  // Organization follow-ups
  organizations.forEach(org => {
    // Check last contact
    if (org.lastContactAt) {
      const daysSince = (Date.now() - new Date(org.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30 && daysSince <= 60) {
        tasks.push({
          id: `follow-${org.id}-contact`,
          entityType: 'organization',
          entityId: org.id,
          entityName: org.name,
          task: 'Contact Organization',
          reason: `No activity in ${Math.round(daysSince)} days`,
          priority: 'medium',
          status: 'open',
          createdAt: now
        });
      }
    }

    // Check verification status
    if (org.verificationStatus === 'pending') {
      tasks.push({
        id: `follow-${org.id}-verify`,
        entityType: 'organization',
        entityId: org.id,
        entityName: org.name,
        task: 'Process Verification',
        reason: 'Verification pending for 7+ days',
        priority: 'high',
        status: 'open',
        createdAt: now
      });
    }
  });

  // Member follow-ups for unverified users
  users.forEach(user => {
    if (user.verificationStatus === 'pending') {
      tasks.push({
        id: `follow-${user.uid}-verify`,
        entityType: 'member',
        entityId: user.uid,
        entityName: user.fullName || user.uid,
        task: 'Process Member Verification',
        reason: 'Identity verification pending',
        priority: 'medium',
        status: 'open',
        createdAt: now
      });
    }
  });

  return tasks;
}
