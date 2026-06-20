import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithEmailLink,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { GuildUser, Jurisdiction } from '../types/guild';

function nowIso() {
  return new Date().toISOString();
}

export async function ensureUserProfile(user: User, jurisdiction?: Jurisdiction) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return snapshot.data() as GuildUser;

  const defaultJurisdiction: Jurisdiction = jurisdiction || {
    countryId: 'india',
    countryName: 'India',
    stateId: 'punjab',
    stateName: 'Punjab',
    cityId: 'ludhiana',
    cityName: 'Ludhiana',
    guildBranchId: 'ludhiana-hq',
    guildBranchName: 'The Guild - Ludhiana'
  };

  const profile: GuildUser = {
    uid: user.uid,
    email: user.email || '',
    fullName: user.displayName || user.email?.split('@')[0] || 'Guild Applicant',
    photoURL: user.photoURL ?? '',
    role: user.email === 'thecentralguild@gmail.com' ? 'founder' : 'applicant',
    status: 'active',
    city: defaultJurisdiction.cityName,
    contactInformation: '',
    skills: [],
    interests: [],
    bio: '',
    verificationStatus: 'pending',
    guildRank: 'Applicant',
    reputationScore: 0,
    experiencePoints: 0,
    knowledgeEntriesCount: 0,
    completedQuests: 0,
    verifiedOutcomes: 0,
    revenueEarned: 0,
    activityHistory: ['Profile Setup via Google Auth'],
    createdBy: user.uid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archiveStatus: 'active',
    jurisdiction: defaultJurisdiction,
    onboardingStep: 1,
    onboardingCompleted: false,
    proofs: [],
    certificates: [],
    achievements: []
  };

  await setDoc(userRef, { ...profile, createdAtServer: serverTimestamp() });
  return profile;
}

export async function registerWithEmail(
  email: string, 
  password: string, 
  fullName: string, 
  jurisdiction: Jurisdiction,
  skills: string[],
  interests: string[],
  additional: {
    phone?: string,
    availability?: string,
    emergencyContact?: string,
    preferredRole?: string,
    referralSource?: string
  } = {}
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, 'users', credential.user.uid);
  
  const profile: GuildUser = {
    uid: credential.user.uid,
    email: email,
    fullName,
    role: email === 'thecentralguild@gmail.com' ? 'founder' : 'applicant',
    status: 'active',
    jurisdiction,
    skills,
    interests,
    ...additional,
    verificationStatus: 'pending',
    guildRank: 'Applicant',
    reputationScore: 0,
    experiencePoints: 0,
    knowledgeEntriesCount: 0,
    completedQuests: 0,
    verifiedOutcomes: 0,
    revenueEarned: 0,
    activityHistory: ['Account Registered via Email'],
    createdBy: credential.user.uid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archiveStatus: 'active',
    onboardingStep: 7,
    onboardingCompleted: true,
    proofs: [],
    certificates: [],
    achievements: []
  };

  await setDoc(userRef, { ...profile, createdAtServer: serverTimestamp() });
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Email Verification
export async function sendVerificationEmail(user: User) {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth?verified=true`,
    handleCodeInApp: true
  };
  await sendEmailVerification(user, actionCodeSettings);
}

export async function verifyEmail(actionCode: string) {
  await applyActionCode(auth, actionCode);
}

export async function checkEmailVerified(user: User): Promise<boolean> {
  await user.reload();
  return user.emailVerified;
}

export async function resendVerificationEmail(user: User) {
  if (!user.email) throw new Error('No email address on user');
  const actionCodeSettings = {
    url: `${window.location.origin}/auth?verified=true`,
    handleCodeInApp: true
  };
  await sendEmailVerification(user, actionCodeSettings);
}

// Password Reset
export async function sendPasswordReset(email: string) {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth?reset=true`,
    handleCodeInApp: true
  };
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}

export async function verifyPasswordReset(actionCode: string, newPassword: string) {
  await confirmPasswordReset(auth, actionCode, newPassword);
}

export async function updateUserPassword(user: User, newPassword: string) {
  await updatePassword(user, newPassword);
}

// Email Update (change email with verification)
export async function requestEmailUpdate(user: User, newEmail: string) {
  const actionCodeSettings = {
    url: `${window.location.origin}/auth?emailUpdated=true`,
    handleCodeInApp: true
  };
  await verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);
}

// Check if sign-in link is valid (for email link auth)
export async function isValidSignInLink(link: string): Promise<boolean> {
  return isSignInWithEmailLink(auth, link);
}

// Complete sign-in with email link
export async function completeSignInWithEmailLink(email: string, link: string) {
  if (!isSignInWithEmailLink(auth, link)) {
    throw new Error('Invalid sign-in link');
  }
  return signInWithEmailLink(auth, email, link);
}
