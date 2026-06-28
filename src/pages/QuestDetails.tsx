import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';
import { applyForQuest, submitQuestCompletion, nowIso, RECEPTIONISTS, getVerificationRequirement, meetsVerificationRequirement, getQuestApplications, getUserQuestParticipation, updateParticipationStatus, notifyUser, acceptApplicant } from '../lib/repository';
import GuildContactCard from '../components/GuildContactCard';
import type { Quest, QuestApplication } from '../types/guild';
import { ArrowLeft, Compass, Award, Calendar, Clock, MapPin, Check, CheckCircle, Send, ShieldAlert, Sparkles, Users, ExternalLink, Wallet, Book, User, FileCheck, XCircle, Pause, Play, Send as SendIcon, Trash2, Loader, Target } from 'lucide-react';
import { PAGE_SEO } from '../components/SEO';

type ApplicantTab = 'applicants' | 'accepted' | 'reports' | 'completed' | 'rejected' | 'removed';

export default function QuestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // All hooks must be defined at the top - consistently executed on every render
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin state - always defined but only populated for admins
  const [applicantTab, setApplicantTab] = useState<ApplicantTab>('applicants');
  const [applicantApps, setApplicantApps] = useState<QuestApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { displayName: string; photoURL: string }>>({});
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [acceptingMember, setAcceptingMember] = useState<string | null>(null);

  // Submission Form States - ALL defined at top level
  const [report, setReport] = useState('');
  const [summary, setSummary] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [achievementInput, setAchievementInput] = useState('');
  const [outputInput, setOutputInput] = useState('');
  const [achievements, setAchievements] = useState<string[]>([]);
  const [outcomesProduced, setOutcomesProduced] = useState<string[]>([]);

  // Refs to track loaded state - avoids conditional useEffect execution
  const questLoadedRef = useRef(false);
  const questIdRef = useRef<string | undefined>(undefined);

  // Admin check - direct boolean expression, not a hook
  const isAdmin = profile?.role === 'receptionist' || profile?.role === 'cityGuildMaster' ||
                 profile?.role === 'stateGuildMaster' || profile?.role === 'founder' || profile?.role === 'guildFounder';

  // ALL useEffects must be defined consecutively at top level
  // Useffect 1: SEO title (runs once on mount)
  useEffect(() => {
    document.title = PAGE_SEO.questDetails.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', PAGE_SEO.questDetails.description);
  }, []);

  // Useffect 2: Load quest and applications (runs when id or success changes)
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const questId: string = id;

    async function loadQuest() {
      try {
        const docRef = doc(db, 'quests', questId);
        const snap = await getDoc(docRef);
        if (cancelled) return;

        if (snap.exists()) {
          const loadedQuest = { id: snap.id, ...snap.data() } as Quest;
          setQuest(loadedQuest);
          questLoadedRef.current = true;
          questIdRef.current = questId;
        } else {
          setError('Quest details not found in ledger.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError('Failed to fetch quest record.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadApplications() {
      if (!isAdmin) return;
      // Wait for quest to be set first
      await new Promise(resolve => {
        const check = () => {
          if (questLoadedRef.current && questIdRef.current === questId) {
            resolve(true);
            return true;
          }
          return false;
        };
        if (!check()) {
          const interval = setInterval(() => {
            if (check()) {
              clearInterval(interval);
              resolve(true);
            }
          }, 50);
        }
      });

      if (cancelled || !questLoadedRef.current) return;

      try {
        const apps = await getQuestApplications(questId);
        if (!cancelled) {
          setApplicantApps(apps);
        }
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        if (!cancelled) {
          setLoadingApps(false);
        }
      }
    }

    loadQuest().then(async () => {
      // Load applications for all users (not just admins) so they can see their acceptance status
      if (!cancelled && profile) {
        setLoadingApps(true);
        loadApplications();
      }
      // Load member profiles for accepted members
      if (!cancelled && questLoadedRef.current) {
        const questSnap = await getDoc(doc(db, 'quests', questId));
        if (questSnap.exists() && !cancelled) {
          const questData = questSnap.data() as Quest;
          const memberIds = Array.from(new Set([...(questData.acceptedMembers || []), ...(questData.completedMembers || [])]));
          const profiles: Record<string, { displayName: string; photoURL: string }> = {};
          for (const memberId of memberIds) {
            try {
              let memberDoc = await getDoc(doc(db, 'users', memberId));
              if (!memberDoc.exists()) {
                memberDoc = await getDoc(doc(db, 'members', memberId));
              }
              if (memberDoc.exists()) {
                const memberData = memberDoc.data();
                profiles[memberId] = {
                  displayName: memberData.displayName || memberData.fullName || 'Unknown Member',
                  photoURL: memberData.photoURL || ''
                };
              } else {
                profiles[memberId] = { displayName: 'Unknown Member', photoURL: '' };
              }
            } catch {
              profiles[memberId] = { displayName: 'Unknown Member', photoURL: '' };
            }
          }
          if (!cancelled) {
            setMemberProfiles(profiles);
          }
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, success, isAdmin]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading Quest from ledger...</div>;
  }

  if (error || !quest) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="panel space-y-4">
          <p className="text-sm text-red-500 font-semibold">{error || 'Quest not found.'}</p>
          <Link to="/quests" className="primary px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Board
          </Link>
        </div>
      </div>
    );
  }

  const hasApplied = profile && (quest.applicants?.includes(profile.uid) || applicantApps.some(a => a.applicantId === profile.uid));
  // Check both acceptedMembers array AND accepted applications
  const hasBeenAccepted = profile && (
    quest.acceptedMembers?.includes(profile.uid) ||
    applicantApps.some(a => a.applicantId === profile.uid && a.status === 'accepted')
  );
  const hasCompleted = profile && (quest.completedMembers?.includes(profile.uid) || quest.status === 'completed');
  const hasRemoved = profile && quest.removedMembers?.includes(profile.uid);
  const hasRejected = profile && quest.rejectedMembers?.includes(profile.uid);

  // Get user's application status for detailed messaging
  const myApplication = profile ? applicantApps.find(a => a.applicantId === profile.uid) : undefined;
  const appStatus = myApplication?.status;

  // Determine the user's primary quest relationship state
  type QuestRelationshipState = 'notApplied' | 'pending' | 'accepted' | 'active' | 'completed' | 'removed' | 'rejected';
  let relationshipState: QuestRelationshipState = 'notApplied';
  if (hasCompleted) relationshipState = 'completed';
  else if (hasRemoved) relationshipState = 'removed';
  else if (hasRejected) relationshipState = 'rejected';
  else if (hasBeenAccepted) relationshipState = quest.status === 'inProgress' ? 'active' : 'accepted';
  else if (hasApplied && (appStatus === 'submitted' || appStatus === 'underReview' || appStatus === 'draft')) relationshipState = 'pending';
  else if (hasApplied) relationshipState = 'pending';

  const handleApply = async () => {
    if (!profile) {
      navigate('/auth');
      return;
    }

    // Block if onboarding not completed
    if (!profile.onboardingCompleted) {
      setError('Please complete onboarding before applying for quests.');
      navigate('/onboarding');
      return;
    }

    // Prevent duplicate applications - check all states before applying
    const myApp = applicantApps.find(a => a.applicantId === profile.uid);
    const appStatus = myApp?.status;
    const isAlreadyAccepted = quest.acceptedMembers?.includes(profile.uid);
    const isRemoved = quest.removedMembers?.includes(profile.uid);
    const isCompleted = quest.completedMembers?.includes(profile.uid);

    // State-based blocking messages
    if (isAlreadyAccepted) {
      setError('You are already accepted for this quest.');
      return;
    }
    if (isCompleted) {
      setError('You have already completed this quest.');
      return;
    }
    if (isRemoved) {
      setError('You were previously removed from this quest.');
      return;
    }
    if (appStatus === 'accepted') {
      setError('You have already been accepted for this quest.');
      return;
    }
    if (appStatus === 'submitted' || appStatus === 'underReview') {
      setError('Application already under review. Please wait for a decision.');
      return;
    }
    if (appStatus === 'draft') {
      // Allow continuing draft application
      navigate(`/quests/${quest.id}/apply`);
      return;
    }

    // Check verification requirement
    const requirement = getVerificationRequirement('joinQuest');
    if (!meetsVerificationRequirement(profile, requirement)) {
      setError(`Verification required: ${requirement} level needed to apply for this quest.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await applyForQuest(quest.id, profile);
      setSuccess('Application recorded successfully.');
    } catch (err: any) {
      setError(err.message || 'Application failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle removing a member from the quest (admin only) - called from modal
  const handleRemoveMember = async (memberUserId: string, reason: string) => {
    if (!quest || !profile || !isAdmin || !reason.trim()) return;

    const memberName = memberProfiles[memberUserId]?.displayName || memberUserId.slice(0, 8);
    setRemovingMember(memberUserId);
    try {
      // Update participation record if exists
      const participation = await getUserQuestParticipation(memberUserId, quest.id);
      if (participation) {
        await updateParticipationStatus(participation.id, 'withdrawn', profile.uid);
      }

      // Remove from quest acceptedMembers, add to removedMembers
      const accepted = quest.acceptedMembers || [];
      const removed = quest.removedMembers || [];
      const newRemovalEntry = { memberId: memberUserId, reason: reason.trim(), removedAt: nowIso(), removedBy: profile.uid, memberName };
      const removalHistory = [...(quest.removalHistory || []), newRemovalEntry];

      await updateDoc(doc(db, 'quests', quest.id), {
        acceptedMembers: accepted.filter(id => id !== memberUserId),
        removedMembers: [...removed, memberUserId],
        removalHistory,
        updatedAt: nowIso()
      });

      // Update local state
      setQuest({
        ...quest,
        acceptedMembers: accepted.filter(id => id !== memberUserId),
        removedMembers: [...removed, memberUserId],
        removalHistory
      });

      // Notify the removed member
      await notifyUser(
        memberUserId,
        'quest_withdrawn',
        'Removed from Quest',
        `You have been removed from "${quest.title}". Reason: ${reason}. Please contact the guild for more information.`,
        '/quests',
        'medium'
      );

      // Clear modal state
      setShowRemovalModal(false);
      setMemberToRemove(null);
      setRemovalReason('');
      alert(`Member ${memberName} has been removed from the quest.`);
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove member. Please try again.');
    } finally {
      setRemovingMember(null);
    }
  };

  // Handle accepting an applicant - adds to quest and updates application status
  const handleAcceptApplicant = async (applicationId: string, applicantId: string, applicantName: string) => {
    if (!quest || !profile || !isAdmin) return;

    setAcceptingMember(applicationId);
    try {
      await acceptApplicant(applicationId, quest.id, applicantId, profile.uid);

      // Refresh applications
      const apps = await getQuestApplications(quest.id);
      setApplicantApps(apps);

      // Notify the accepted member
      await notifyUser(
        applicantId,
        'quest_accepted',
        'Accepted to Quest',
        `You have been accepted to "${quest.title}"! Check your quest dashboard for next steps.`,
        `/quests/${quest.id}`,
        'high'
      );

      alert(`${applicantName || 'Applicant'} has been accepted to the quest.`);
    } catch (err) {
      console.error('Failed to accept applicant:', err);
      alert('Failed to accept applicant. Please try again.');
    } finally {
      setAcceptingMember(null);
    }
  };

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    // Check verification for paid quests (paymentAmount > 0)
    if ((quest.paymentAmount || 0) > 0) {
      const requirement = getVerificationRequirement('receivePayment');
      if (!meetsVerificationRequirement(profile, requirement)) {
        setError(`Payment requires full verification. Complete your verification to receive rewards.`);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      await submitQuestCompletion(quest.id, profile, {
        report,
        summary,
        achievements: achievements.length > 0 ? achievements : undefined,
        outcomesProduced: outcomesProduced.length > 0 ? outcomesProduced : undefined,
        links: linkInput ? [linkInput] : [],
        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
        questType: quest.questType as 'standard' | 'openSource' | undefined,
        memberName: profile.fullName
      });
      setSuccess('Proof of completion submitted for review.');
      setReport('');
      setSummary('');
      setLinkInput('');
      setEvidenceUrl('');
      setAchievements([]);
      setOutcomesProduced([]);
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions to add achievements/outcomes
  const addAchievement = () => {
    if (achievementInput.trim() && !achievements.includes(achievementInput.trim())) {
      setAchievements([...achievements, achievementInput.trim()]);
      setAchievementInput('');
    }
  };

  const removeAchievement = (achievement: string) => {
    setAchievements(achievements.filter(a => a !== achievement));
  };

  const addOutcome = () => {
    if (outputInput.trim() && !outcomesProduced.includes(outputInput.trim())) {
      setOutcomesProduced([...outcomesProduced, outputInput.trim()]);
      setOutputInput('');
    }
  };

  const removeOutcome = (outcome: string) => {
    setOutcomesProduced(outcomesProduced.filter(o => o !== outcome));
  };

  // Find coordinator receptionist
  const coordinator = RECEPTIONISTS.find(r => r.uid === quest.assignedReceptionistId) || RECEPTIONISTS[0];

  // Filter applications by tab
  const getFilteredByTab = () => {
    switch (applicantTab) {
      case 'applicants':
        return applicantApps.filter(a => a.status === 'submitted' || a.status === 'underReview' || a.status === 'draft');
      case 'accepted':
        return applicantApps.filter(a => a.status === 'accepted');
      case 'reports':
        return applicantApps.filter(a => a.status === 'accepted'); // Could add quest submissions later
      case 'completed':
        return applicantApps.filter(a => a.status === 'completed');
      case 'rejected':
        return applicantApps.filter(a => a.status === 'rejected' || a.status === 'withdrawn');
      case 'removed':
        // Show removed members from removalHistory
        return [];
      default:
        return applicantApps;
    }
  };

  // Get status display config
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'submitted': return { label: 'Submitted', color: 'bg-amber-500/20 text-amber-400' };
      case 'underReview': return { label: 'Under Review', color: 'bg-blue-500/20 text-blue-400' };
      case 'accepted': return { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' };
      case 'rejected': return { label: 'Rejected', color: 'bg-red-500/20 text-red-400' };
      case 'withdrawn': return { label: 'Withdrawn', color: 'bg-slate-500/20 text-slate-400' };
      case 'completed': return { label: 'Completed', color: 'bg-purple-500/20 text-purple-400' };
      default: return { label: status, color: 'bg-slate-500/20 text-slate-400' };
    }
  };

  const applicantTabCounts = {
    applicants: applicantApps.filter(a => a.status === 'submitted' || a.status === 'underReview' || a.status === 'draft').length,
    accepted: applicantApps.filter(a => a.status === 'accepted').length,
    reports: applicantApps.filter(a => a.status === 'accepted').length, // Placeholder
    completed: applicantApps.filter(a => a.status === 'completed').length,
    rejected: applicantApps.filter(a => a.status === 'rejected' || a.status === 'withdrawn').length,
    removed: (quest.removedMembers || []).length
  };

  const adminTabs: { id: ApplicantTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'applicants', label: 'Applicants', icon: User, count: applicantTabCounts.applicants },
    { id: 'accepted', label: 'Active', icon: Play, count: applicantTabCounts.accepted },
    { id: 'reports', label: 'Reports', icon: SendIcon, count: applicantTabCounts.reports },
    { id: 'completed', label: 'Completed', icon: FileCheck, count: applicantTabCounts.completed },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: applicantTabCounts.rejected },
    { id: 'removed', label: 'Removed', icon: Trash2, count: applicantTabCounts.removed }
  ];

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6 text-left animate-fade-up">
      {/* Back button */}
      <div>
        <Link to="/quests" className="ghost px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Quest Board
        </Link>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        
        {/* Left Column: Details */}
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="panel space-y-4">
            {/* Acceptance Banner */}
            {hasBeenAccepted && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--primary)]/20 to-emerald-500/10 border border-[var(--primary)]/30">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                    <CheckCircle size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--primary)]">You have been accepted for this quest</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      You are an active participant • Complete this quest to earn reputation
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-0.5 rounded border border-[var(--primary)]/20">
                {quest.difficulty} Difficulty
              </span>
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--card-subtle)] px-2.5 py-0.5 rounded border border-[var(--border)] font-semibold">
                Category: {quest.category}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--card-subtle)] px-2.5 py-0.5 rounded border border-[var(--border)] font-semibold">
                Nature: {quest.questNature || 'Development'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{quest.title}</h1>

            <p className="text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[10px] font-mono bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                ID: {quest.guildQuestId || quest.id.slice(0, 12)}
              </span>
              <span>Posted by: <strong className="text-[var(--text-secondary)] font-bold">{quest.organizationName || 'Guild Hub'}</strong></span>
              <span className="text-[10px] text-gray-500 hidden">Your role: {profile?.role}</span>
              <span>Status: <strong className="text-[var(--primary)] uppercase tracking-wider">{quest.status}</strong></span>
            </p>
          </div>

          {/* Quest Executive Briefing (grouped for readability) */}
          <div className="panel space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Quest Executive Brief</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blueprint */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Book size={14} className="text-[var(--primary)]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Blueprint</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{quest.description}</p>
              </div>

              {/* Requirements */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-[var(--primary)]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Requirements</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Members needed</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.membersRequired || 1}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Members assigned</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.acceptedMembers?.length || 0}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Deadline</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">
                      {quest.deadline ? new Date(quest.deadline as string).toLocaleDateString() : 'Open-ended'}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Required skills</span>
                  <div className="flex flex-wrap gap-1">
                    {quest.requiredSkills?.length ? quest.requiredSkills.map((skill, i) => (
                      <span key={i} className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded border border-[var(--primary)]/20">
                        {skill}
                      </span>
                    )) : <span className="text-[var(--text-muted)] text-xs">No specific skills required</span>}
                  </div>
                </div>

                <div className="mt-3">
                  <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Knowledge output</span>
                  <span className="font-semibold text-[var(--text-secondary)] text-xs">
                    {quest.knowledgeRequired ? 'Required' : 'Not Required'}
                  </span>
                </div>
              </div>

              {/* Verification */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck size={14} className="text-[var(--primary)]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Verification</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Method</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.verificationMethod || 'Manual Review'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Rank required</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">Rank {quest.requiredRank || 'Applicant'}</span>
                  </div>
                </div>
              </div>

              {/* Outcome */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={14} className="text-[var(--primary)]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Outcome</span>
                </div>
                {quest.expectedOutcome ? (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{quest.expectedOutcome}</p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Outcome details not specified.</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Priority</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.priority || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Mode</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.mode || 'Remote'}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">City</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.location?.city || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">State</span>
                    <span className="block font-semibold text-[var(--text-secondary)]">{quest.location?.state || '—'}</span>
                  </div>
                </div>

                {quest.assignedReceptionistId && (
                  <div className="mt-3">
                    <GuildContactCard
                      contact={{
                        uid: quest.assignedReceptionistId,
                        fullName: quest.assignedReceptionistName || 'Unknown',
                        role: 'receptionist'
                      }}
                      roleLabel="Guild Contact"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description (left as existing section for scrolling continuity on desktop; Blueprint now appears in the executive brief) */}
          <div className="panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider">Quest Blueprint</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-normal">
              {quest.description}
            </p>
          </div>


          {/* "What should I do next?" Panel - for accepted members */}
          {hasBeenAccepted && !hasCompleted && (
            <div className="panel space-y-3 border border-amber-500/20 bg-amber-500/5">
              <div className="flex gap-2 items-center">
                <Compass size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider">What should I do next?</h3>
              </div>

              {/* Context-aware next steps based on quest status */}
              {quest.status === 'open' || quest.status === 'assigned' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start text-xs">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">Read the quest details above and prepare to begin your mission</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">Gather any resources, tools, or materials needed</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">Review deadlines and requirements carefully</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">Start working on your deliverables</p>
                  </div>
                </div>
              ) : quest.status === 'inProgress' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start text-xs">
                    <Play size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">Quest is in progress - continue working on your deliverables</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">Document your work as you complete it</p>
                  </div>
                  <div className="flex gap-2 items-start text-xs">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--text-secondary)]">When ready, submit proof of completion below</p>
                  </div>
                </div>
              ) : quest.status === 'underReview' ? (
                <div className="flex gap-2 items-start text-xs">
                  <Clock size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[var(--text-secondary)]">Your submission is being reviewed. You'll be notified once evaluation is complete.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Submission panel for accepted members */}
          {hasBeenAccepted && !hasCompleted && (quest.status === 'inProgress' || quest.status === 'assigned') && (
            <div className="panel space-y-4 border border-[var(--primary)]/20 bg-[var(--primary)]/5">
              <div className="flex gap-2 items-center">
                <Sparkles size={16} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Submit Proof of Completion</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Provide detailed evidence and links of your deliverables. Your assigned coordinator will review and verify this to issue reputation points and certification logs.
              </p>

              <form onSubmit={handleSubmission} className="space-y-4">
                {/* Summary - brief overview */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Executive Summary</label>
                  <textarea
                    rows={2}
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="Brief summary of what was accomplished (visible in reports)..."
                    className="text-xs"
                  />
                </div>

                {/* Main Report */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 required">Contribution Report</label>
                  <textarea
                    required
                    rows={4}
                    value={report}
                    onChange={e => setReport(e.target.value)}
                    placeholder="Describe what work was completed, obstacles solved, and lessons learned..."
                    className="text-xs"
                  />
                </div>

                {/* Achievements */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Key Achievements</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={achievementInput}
                      onChange={e => setAchievementInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAchievement())}
                      placeholder="Add an achievement..."
                      className="text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={addAchievement}
                      className="btn btn-xs"
                    >
                      Add
                    </button>
                  </div>
                  {achievements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {achievements.map((a, i) => (
                        <span key={i} className="badge badge-amber flex items-center gap-1">
                          {a}
                          <button type="button" onClick={() => removeAchievement(a)} className="hover:text-red-400">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outcomes Produced */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Outcomes Produced</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={outputInput}
                      onChange={e => setOutputInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOutcome())}
                      placeholder="Add an outcome/deliverable..."
                      className="text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={addOutcome}
                      className="btn btn-xs"
                    >
                      Add
                    </button>
                  </div>
                  {outcomesProduced.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {outcomesProduced.map((o, i) => (
                        <span key={i} className="badge badge-emerald flex items-center gap-1">
                          {o}
                          <button type="button" onClick={() => removeOutcome(o)} className="hover:text-red-400">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Evidence URL (e.g. GitHub, Figma link)</label>
                    <input
                      type="url"
                      value={linkInput}
                      onChange={e => setLinkInput(e.target.value)}
                      placeholder="https://github.com/..."
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Visual Mockup/Screenshot Link</label>
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={e => setEvidenceUrl(e.target.value)}
                      placeholder="https://image-hosting.com/..."
                      className="text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="primary w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"
                >
                  <Send size={13} />
                  <span>{submitting ? 'Submitting Proof...' : 'Submit Completed Quest'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Under Review State */}
          {quest.status === 'underReview' && hasApplied && (
            <div className="panel bg-[var(--card-subtle)] border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong className="block text-[var(--text)] mb-1 uppercase tracking-wider text-[10px]">Quest Under Evaluation</strong>
              Your submission proof is currently pending evaluation by your branch relationship manager. Once confirmed, points will automatically register on your growth score.
            </div>
          )}
        </div>

        {/* Right Column: Actions & Meta Info */}
        <div className="space-y-6">
          {/* Open Source Quest Workspace Access - for accepted members */}
          {quest.questType === 'openSource' && hasBeenAccepted && quest.openSourceConfig?.teamWorkspace && (
            <div className="panel p-4 border border-purple-500/30 bg-purple-500/5 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Users size={16} />
                <h3 className="text-sm font-bold uppercase tracking-wider">Team Workspace</h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Access team resources, milestones, and announcements.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {quest.openSourceConfig.teamWorkspace.announcements && (
                  <div className="p-2 bg-[var(--bg-subtle)] rounded">
                    <div className="font-bold">{quest.openSourceConfig.teamWorkspace.announcements.length}</div>
                    <div className="text-[var(--text-muted)]">Announcements</div>
                  </div>
                )}
                {quest.openSourceConfig.teamWorkspace.milestones && (
                  <div className="p-2 bg-[var(--bg-subtle)] rounded">
                    <div className="font-bold">
                      {quest.openSourceConfig.teamWorkspace.milestones.filter(m => m.status === 'completed').length}/
                      {quest.openSourceConfig.teamWorkspace.milestones.length}
                    </div>
                    <div className="text-[var(--text-muted)]">Milestones</div>
                  </div>
                )}
                {quest.openSourceConfig.teamWorkspace.resources && (
                  <div className="p-2 bg-[var(--bg-subtle)] rounded">
                    <div className="font-bold">{quest.openSourceConfig.teamWorkspace.resources.length}</div>
                    <div className="text-[var(--text-muted)]">Resources</div>
                  </div>
                )}
              </div>
              <Link
                to={`/quests/${quest.id}/workspace`}
                className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white w-full flex items-center justify-center gap-1"
              >
                <ExternalLink size={12} /> Open Workspace
              </Link>
            </div>
          )}

          {/* Actions card */}
          <div className="panel space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Quest Reward Index</span>
              <strong className="text-3xl font-extrabold text-[var(--primary)] block">+{quest.reputationPoints} Rep</strong>
              {quest.isPaid && quest.memberPayout && (
                <span className="text-sm font-bold text-emerald-400 block mt-1">
                  Reward: ₹{quest.memberPayout}
                  {quest.paymentStatus === 'Paid' ? ' (Paid)' : quest.paymentStatus === 'Pending' ? ' (Pending)' : ''}
                </span>
              )}
            </div>

            <div className="border-t border-[var(--border)] pt-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] flex items-center gap-1"><Clock size={12} /> Hours Estimate</span>
                <span className="font-semibold text-[var(--text-secondary)]">{quest.estimatedHours || 12} hours</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] flex items-center gap-1"><MapPin size={12} /> Location</span>
                <span className="font-semibold text-[var(--text-secondary)]">{quest.mode}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] flex items-center gap-1"><Calendar size={12} /> Rank Required</span>
                <span className="font-semibold text-[var(--text-secondary)]">Rank {quest.requiredRank || 'Applicant'}</span>
              </div>
            </div>

            {/* Knowledge Base Link - For quests with knowledge records */}
            {quest.knowledgeRequired && (
              <div className="border-t border-[var(--border)] pt-4 mt-4">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Book size={12} /> Knowledge Required
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  This quest requires a knowledge submission upon completion.
                </p>
              </div>
            )}

            {/* Fundraising Progress - For Open Source quests with fundraising */}
            {quest.questType === 'openSource' && quest.openSourceConfig?.fundraisingGoal && (
              <div className="border-t border-[var(--border)] pt-4 mt-4">
                <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Wallet size={12} /> Fundraising Goal
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-[var(--bg-subtle)] h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((quest.openSourceConfig.fundsRaised || 0) / quest.openSourceConfig.fundraisingGoal) * 100)}%`
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-400 font-bold">
                    {quest.openSourceConfig.fundraisingCurrency || '$'}{(quest.openSourceConfig.fundsRaised || 0).toLocaleString()}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    / {quest.openSourceConfig.fundraisingGoal.toLocaleString()}
                  </span>
                </div>
                {quest.openSourceConfig.contributions && quest.openSourceConfig.contributions.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    {quest.openSourceConfig.contributions.length} contribution(s)
                  </div>
                )}
              </div>
            )}

            {/* Application action trigger - with detailed state messaging */}
            {!hasBeenAccepted && !hasCompleted && quest.status === 'open' && (
              <div>
                {hasApplied ? (
                  // Show detailed status based on application state
                  (() => {
                    const myApp = applicantApps.find(a => a.applicantId === profile?.uid);
                    const appStatus = myApp?.status || 'submitted';
                    if (appStatus === 'draft') {
                      return (
                        <button
                          onClick={handleApply}
                          disabled={submitting}
                          className="w-full py-3 rounded-xl font-bold text-xs cursor-pointer bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        >
                          Continue Application
                        </button>
                      );
                    }
                    if (appStatus === 'submitted' || appStatus === 'underReview') {
                      return (
                        <div className="p-3 text-center bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold rounded-xl">
                          <Clock size={14} className="inline mr-1" />
                          Application Under Review
                        </div>
                      );
                    }
                    if (appStatus === 'rejected') {
                      return (
                        <div className="p-3 text-center bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">
                          <XCircle size={14} className="inline mr-1" />
                          Not Selected This Time
                        </div>
                      );
                    }
                    if (appStatus === 'withdrawn') {
                      return (
                        <div className="p-3 text-center bg-gray-500/10 border border-gray-500/20 text-gray-500 text-xs font-bold rounded-xl">
                          <Pause size={14} className="inline mr-1" />
                          Application Withdrawn
                        </div>
                      );
                    }
                    // Default: pending
                    return (
                      <button
                        onClick={handleApply}
                        disabled={submitting}
                        className="w-full py-3 rounded-xl font-bold text-xs cursor-pointer bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      >
                        Application Pending Review
                      </button>
                    );
                  })()
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl font-bold text-xs cursor-pointer primary"
                  >
                    Apply For Quest
                  </button>
                )}
              </div>
            )}

            {hasCompleted && (
              <div className="p-3 text-center bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold rounded-xl">
                <Award size={14} className="inline mr-1" />
                Quest Completed
              </div>
            )}
          </div>

          {/* Assigned Representative Details */}
          <div className="panel space-y-4 text-xs">
            <h4 className="font-bold text-[var(--text-secondary)] uppercase tracking-wider">Branch Representative</h4>
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border)] bg-black">
                <img src={coordinator.photoURL} alt={coordinator.fullName} className="w-full h-full object-cover" />
              </div>
              <div>
                <strong className="text-sm font-bold text-[var(--text)] block">{coordinator.fullName}</strong>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{coordinator.role}</span>
              </div>
            </div>
            <p className="text-[var(--text-muted)] leading-relaxed pt-2 border-t border-[var(--border)]">
              This officer validates deliverables and manages coordination logs for this quest's outcomes.
            </p>
          </div>
        </div>
      </div>

      {/* ADMIN: Applicant Lifecycle Tabs */}
      {isAdmin && (
        <div className="panel space-y-4 animate-fade-up">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
            <Users size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-bold">Quest Participants</h2>
            <span className="text-xs text-[var(--text-muted)]">({applicantApps.length} total)</span>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto pb-px">
            {adminTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setApplicantTab(tab.id)}
                  className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    applicantTab === tab.id
                      ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                    applicantTab === tab.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card-subtle)]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Applicants List */}
          {applicantTab === 'removed' ? (
            // Special rendering for removed members - show removal history
            <div className="space-y-3">
              {(quest.removalHistory || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  No members have been removed from this quest.
                </div>
              ) : (
                quest.removalHistory!.map((entry, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                          <User size={14} className="text-red-400" />
                        </div>
                        <div>
                          <Link to={`/member/${entry.memberId}`} className="text-xs font-bold hover:text-red-400 transition-colors">
                            {entry.memberName || entry.memberId.slice(0, 8)}
                          </Link>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Removed {entry.removedAt ? new Date(entry.removedAt).toLocaleDateString() : 'recently'}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase bg-red-500/20 text-red-400">
                        Removed
                      </span>
                    </div>
                    {entry.reason && (
                      <div className="mt-2 text-xs text-[var(--text-muted)] p-2 bg-[var(--bg-subtle)] rounded">
                        <span className="font-bold text-red-400">Reason:</span> {entry.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              {getFilteredByTab().map(app => {
                const statusInfo = getStatusConfig(app.status);
                return (
                  <div key={app.id} className="p-3 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link to={`/member/${app.applicantId}`} className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center hover:bg-[var(--primary)]/30 transition-colors">
                        <User size={14} className="text-[var(--primary)]" />
                      </Link>
                      <div>
                        <Link to={`/member/${app.applicantId}`} className="text-xs font-bold hover:text-[var(--primary)] transition-colors">
                          {app.applicantName || `User: ${app.applicantId.slice(0, 8)}`}
                        </Link>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'recently'}
                          {app.roleTitle && <span className="ml-2 text-purple-400">Role: {app.roleTitle}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Accept button for pending applicants (admin only) */}
                      {isAdmin && (app.status === 'submitted' || app.status === 'underReview' || app.status === 'draft') && (
                        <button
                          onClick={() => handleAcceptApplicant(app.id, app.applicantId, app.applicantName || app.applicantId.slice(0, 8))}
                          disabled={acceptingMember === app.id}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          title="Accept applicant to quest"
                        >
                          {acceptingMember === app.id ? (
                            <Loader size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                        </button>
                      )}
                      {/* Remove button for accepted members (admin only) */}
                      {isAdmin && app.status === 'accepted' && (
                        <button
                          onClick={() => { setMemberToRemove({ userId: app.applicantId, name: app.applicantName || app.applicantId.slice(0, 8) }); setShowRemovalModal(true); }}
                          disabled={removingMember === app.applicantId}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Remove member from quest"
                        >
                          {removingMember === app.applicantId ? (
                            <Loader size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      )}
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Removal Reason Modal */}
      {showRemovalModal && memberToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel max-w-md w-full p-6 animate-fade-up space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 size={18} />
              <h3 className="text-lg font-bold">Remove Member</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              You are about to remove <span className="font-bold text-[var(--text)]">{memberToRemove.name}</span> from this quest. This action cannot be undone.
            </p>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 required">
                Removal Reason
              </label>
              <textarea
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder="Enter the reason for removal (e.g., 'Inactive for 2 weeks', 'Unable to complete assigned tasks', etc.)..."
                className="w-full h-24 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-sm resize-none"
                autoFocus
              />
              <p className="text-[10px] text-red-400 mt-1">This reason will be visible to the removed member.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowRemovalModal(false); setMemberToRemove(null); setRemovalReason(''); }}
                className="btn btn-sm btn-outline flex-1"
                disabled={removingMember !== null}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(memberToRemove.userId, removalReason)}
                disabled={!removalReason.trim() || removingMember !== null}
                className="btn btn-sm bg-red-500 hover:bg-red-600 text-white flex-1 flex items-center justify-center gap-1"
              >
                {removingMember ? (
                  <>
                    <Loader size={14} className="animate-spin" /> Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Remove Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
