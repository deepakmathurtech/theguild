import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Quest, QuestApplication, QuestApplicationStatus } from '../types/guild';
import { Compass, CheckCircle, XCircle, Clock, User, ChevronRight, Award, Loader, FileText, Briefcase, BookOpen, Send, Users, FileCheck, Undo2, Pause, Play, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { nowIso, createParticipation, notifyUser, getUserQuestParticipation, updateParticipationStatus, checkQuestCapacity, checkExistingParticipation } from '../lib/repository';

interface ApplicationWithDetails extends QuestApplication {
  questTitle?: string;
}

type LifecycleTab = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed' | 'all';

export default function QuestApplications() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LifecycleTab>('pending');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<{ application: ApplicationWithDetails; action: 'accept' | 'reject' | 'complete' | 'withdraw' } | null>(null);
  const [notes, setNotes] = useState('');

  // Only receptionists and admins can manage
  const canManage = profile && ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'founder', 'guildFounder'].includes(profile.role);

  useEffect(() => {
    async function loadApplications() {
      if (!profile) return;
      try {
        // Fetch all quest applications
        const q = query(collection(db, 'questApplications'));
        const snapshot = await getDocs(q);
        const apps: ApplicationWithDetails[] = [];

        for (const docSnap of snapshot.docs) {
          const appData = docSnap.data() as QuestApplication;
          // Fetch associated quest to get title
          const questDoc = await getDoc(doc(db, 'quests', appData.questId));
          const questData = questDoc.exists() ? questDoc.data() : null;

          apps.push({
            ...appData,
            id: docSnap.id,
            questTitle: questData?.title || 'Unknown Quest'
          });
        }

        // Load ALL applications - filter by tab in render
        setApplications(apps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, [profile]);

  // Get applications filtered by active tab
  const getFilteredApplications = () => {
    switch (activeTab) {
      case 'pending':
        return applications.filter(a =>
          a.status === 'submitted' || a.status === 'underReview' || a.status === 'draft'
        );
      case 'accepted':
        return applications.filter(a => a.status === 'accepted');
      case 'rejected':
        return applications.filter(a => a.status === 'rejected');
      case 'withdrawn':
        return applications.filter(a => a.status === 'withdrawn');
      case 'completed':
        return applications.filter(a => a.status === 'completed');
      case 'all':
      default:
        return applications;
    }
  };

  // Calculate counts for each status
  const counts = {
    pending: applications.filter(a =>
      a.status === 'submitted' || a.status === 'underReview' || a.status === 'draft'
    ).length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    withdrawn: applications.filter(a => a.status === 'withdrawn').length,
    completed: applications.filter(a => a.status === 'completed').length,
    all: applications.length
  };

  const groupedByQuest = getFilteredApplications().reduce((acc, app) => {
    if (!acc[app.questId]) {
      acc[app.questId] = [];
    }
    acc[app.questId].push(app);
    return acc;
  }, {} as Record<string, ApplicationWithDetails[]>);

  const handleReview = async () => {
    if (!showModal || !profile) return;
    setProcessing(showModal.application.id);

    console.log('[QuestApplications] Starting review - action:', showModal.action, 'appId:', showModal.application.id, 'status:', showModal.application.status);

    try {
      const appRef = doc(db, 'questApplications', showModal.application.id);
      let newStatus: QuestApplicationStatus;

      // Verify current application status before processing
      const currentAppDoc = await getDoc(appRef);
      if (currentAppDoc.exists()) {
        const currentData = currentAppDoc.data() as QuestApplication;
        console.log('[QuestApplications] Current app status in Firestore:', currentData.status);
        if (currentData.status === 'accepted') {
          console.warn('[QuestApplications] App is already accepted - may be duplicate click');
          alert('This application has already been accepted. Please refresh the page.');
          setProcessing(null);
          return;
        }
      } else {
        console.error('[QuestApplications] App document not found!');
        alert('Application not found. It may have been deleted.');
        setProcessing(null);
        return;
      }

      switch (showModal.action) {
        case 'accept':
          newStatus = 'accepted';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'complete':
          newStatus = 'completed';
          break;
        case 'withdraw':
          newStatus = 'withdrawn';
          break;
        default:
          return;
      }

      // CRITICAL: Move ALL pre-acceptance checks BEFORE updating status to prevent desync
      // The issue: Previously, status was updated to "accepted" BEFORE capacity/duplicate checks,
      // causing desync when checks failed (application shows "accepted" but no participation exists)
      if (showModal.action === 'accept') {
        console.log('[QuestApplications] Pre-accept validation for:', showModal.application.applicantId, 'quest:', showModal.application.questId);

        // Check quest exists first
        const questRef = doc(db, 'quests', showModal.application.questId);
        const questDoc = await getDoc(questRef);
        if (!questDoc.exists()) {
          console.error('[QuestApplications] ERROR: Quest document not found:', showModal.application.questId);
          alert(`ERROR: Quest not found. Please refresh and try again.`);
          setProcessing(null);
          return;
        }

        const questData = questDoc.data() as Quest;
        const existingMembers = questData.acceptedMembers || [];

        // SECURITY FIX: Check quest capacity BEFORE accepting (moved before any status updates)
        const capacity = await checkQuestCapacity(showModal.application.questId);
        if (!capacity.hasCapacity) {
          console.error('[QuestApplications] Quest is full:', capacity);
          alert(`ERROR: Quest is full (${capacity.current}/${capacity.required} members). Cannot accept more applicants.`);
          setProcessing(null);
          return;
        }

        // SECURITY FIX: Check if user already has participation record BEFORE accepting
        const existingPart = await checkExistingParticipation(showModal.application.questId, showModal.application.applicantId);
        if (existingPart) {
          console.error('[QuestApplications] User already has participation record:', existingPart.id);
          alert(`ERROR: User already has a participation record for this quest. They may have been accepted already.`);
          setProcessing(null);
          return;
        }

        console.log('[QuestApplications] All pre-checks passed, proceeding with acceptance');

        // Only now - update quest acceptedMembers (safe to do)
        if (!existingMembers.includes(showModal.application.applicantId)) {
          await updateDoc(questRef, {
            acceptedMembers: [...existingMembers, showModal.application.applicantId],
            updatedAt: nowIso()
          });
          console.log('[QuestApplications] Added to acceptedMembers:', showModal.application.applicantId);
        }

        // Create participation record - this is the source of truth for user's quest involvement
        try {
          const participationId = await createParticipation(showModal.application as QuestApplication, questData, profile.uid);
          console.log('[QuestApplications] Created participation record:', participationId);
        } catch (participationErr) {
          console.error('[QuestApplications] FAILED to create participation:', participationErr);
          // Rollback: Remove from acceptedMembers if participation creation failed
          await updateDoc(questRef, {
            acceptedMembers: existingMembers.filter(id => id !== showModal.application.applicantId),
            updatedAt: nowIso()
          });
          alert(`ERROR: Could not complete acceptance. ${participationErr}. Please try again.`);
          setProcessing(null);
          return;
        }

        // Send notification to the accepted user
        try {
          await notifyUser(
            showModal.application.applicantId,
            'quest_accepted',
            'Quest Application Accepted!',
            `You have been accepted to: ${questData.title}. Check your My Quests page to get started.`,
            `/my-quests/${showModal.application.questId}`,
            'high'
          );
          console.log('[QuestApplications] Sent notification to user:', showModal.application.applicantId);
        } catch (notifyErr) {
          console.error('[QuestApplications] FAILED to send notification:', notifyErr);
          // Don't fail the whole flow for notification error
        }
      }

      // NOW update application status (after all pre-checks passed and participation created)
      // CRITICAL: This must succeed - if it fails, the application stays in submitted
      // but user already has participation record created above
      try {
        const updateData: Record<string, unknown> = {
          status: newStatus,
          reviewerId: profile.uid,
          reviewerNotes: notes || undefined,
          reviewedAt: nowIso()
        };

        console.log('[QuestApplications] About to update status to:', newStatus, 'for app:', showModal.application.id);
        await updateDoc(appRef, updateData);
        console.log('[QuestApplications] Updated application status to:', newStatus);
      } catch (statusErr) {
        console.error('[QuestApplications] CRITICAL ERROR - Failed to update application status:', statusErr);
        alert(`CRITICAL ERROR: Application acceptance may be incomplete.\n\nStatus update failed: ${statusErr}\nThe participation record was created but application status couldn't be updated. Please check Firebase Console.`);
        // Don't close the modal - let user see the error and refresh
        return;
      }

      // Update local state (now we know it succeeded)
      setApplications(prev =>
        prev.map(app =>
          app.id === showModal.application.id
            ? { ...app, status: newStatus, reviewerNotes: notes, reviewerId: profile.uid } as ApplicationWithDetails
            : app
        )
      );

      // Send notification for rejection
      if (showModal.action === 'reject') {
        await notifyUser(
          showModal.application.applicantId,
          'quest_rejected',
          'Quest Application Update',
          `Your application to: ${showModal.application.questTitle || 'the quest'} was not accepted.`,
          `/quests`,
          'medium'
        );
      }

      // Also update participation record and quest members for "Mark Complete" (completions without report)
      if (showModal.action === 'complete') {
        const participation = await getUserQuestParticipation(
          showModal.application.applicantId,
          showModal.application.questId
        );
        if (participation) {
          // Update participation status
          await updateParticipationStatus(participation.id, 'completed', profile.uid);
          console.log('[QuestApplications] Updated participation to completed:', participation.id);

          // Update quest member lists
          const questRef = doc(db, 'quests', showModal.application.questId);
          const questDoc = await getDoc(questRef);
          if (questDoc.exists()) {
            const questData = questDoc.data() as Quest;
            const accepted = questData.acceptedMembers || [];
            const completed = questData.completedMembers || [];
            await updateDoc(questRef, {
              acceptedMembers: accepted.filter(id => id !== showModal.application.applicantId),
              completedMembers: [...completed, showModal.application.applicantId],
              updatedAt: nowIso()
            });
            console.log('[QuestApplications] Updated quest member lists');
          }

          // Notify user
          await notifyUser(
            showModal.application.applicantId,
            'quest_completed',
            'Quest Completed!',
            `Congratulations! Your involvement in "${showModal.application.questTitle}" has been marked as completed!`,
            `/my-quests`,
            'high'
          );
        }
      }

      // Handle Withdraw/Remove from Quest (admin removing an accepted member)
      if (showModal.action === 'withdraw') {
        const memberUserId = showModal.application.applicantId;
        const questId = showModal.application.questId;

        console.log('[QuestApplications] Withdrawing member:', memberUserId, 'from quest:', questId);

        // Get the participation record and update status to 'withdrawn'
        const participation = await getUserQuestParticipation(memberUserId, questId);
        if (participation) {
          // Update participation status to withdrawn
          await updateParticipationStatus(participation.id, 'withdrawn', profile.uid);
          console.log('[QuestApplications] Updated participation to withdrawn:', participation.id);

          // Remove from quest acceptedMembers
          const questRef = doc(db, 'quests', questId);
          const questDoc = await getDoc(questRef);
          if (questDoc.exists()) {
            const questData = questDoc.data() as Quest;
            const accepted = questData.acceptedMembers || [];
            await updateDoc(questRef, {
              acceptedMembers: accepted.filter(id => id !== memberUserId),
              updatedAt: nowIso()
            });
            console.log('[QuestApplications] Removed member from quest acceptedMembers');
          }
        } else {
          // Fallback: just remove from quest acceptedMembers (participation might not exist)
          const questRef = doc(db, 'quests', questId);
          const questDoc = await getDoc(questRef);
          if (questDoc.exists()) {
            const questData = questDoc.data() as Quest;
            const accepted = questData.acceptedMembers || [];
            await updateDoc(questRef, {
              acceptedMembers: accepted.filter(id => id !== memberUserId),
              updatedAt: nowIso()
            });
            console.log('[QuestApplications] Removed member from quest acceptedMembers (no participation record)');
          }
        }

        // Notify the removed member
        await notifyUser(
          memberUserId,
          'quest_withdrawn',
          'Removed from Quest',
          `You have been removed from "${showModal.application.questTitle}". Reason: ${notes || 'No reason provided'}. Please contact the guild for more information.`,
          `/quests`,
          'medium'
        );
        console.log('[QuestApplications] Sent withdraw notification to member');
      }

      setShowModal(null);
      setNotes('');
    } catch (err) {
      console.error('[QuestApplications] FAILED to review application:', err);
      alert(`ERROR: Failed to process application. Check console for details.\n\nError: ${err}`);
    } finally {
      setProcessing(null);
    }
  };

  // Status display helper
  const getStatusDisplay = (status: QuestApplicationStatus) => {
    switch (status) {
      case 'submitted': return { label: 'Submitted', color: 'bg-amber-500/20 text-amber-400' };
      case 'underReview': return { label: 'Under Review', color: 'bg-blue-500/20 text-blue-400' };
      case 'accepted': return { label: 'Accepted', color: 'bg-emerald-500/20 text-emerald-400' };
      case 'rejected': return { label: 'Rejected', color: 'bg-red-500/20 text-red-400' };
      case 'withdrawn': return { label: 'Withdrawn', color: 'bg-slate-500/20 text-slate-400' };
      case 'completed': return { label: 'Completed', color: 'bg-purple-500/20 text-purple-400' };
      default: return { label: status, color: 'bg-slate-500/20 text-slate-400' };
    }
  };

  // Tab configuration
  const tabs: { id: LifecycleTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'pending', label: 'Pending', icon: Clock, count: counts.pending },
    { id: 'accepted', label: 'Active', icon: Play, count: counts.accepted },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: counts.rejected },
    { id: 'withdrawn', label: 'Withdrawn', icon: Pause, count: counts.withdrawn },
    { id: 'completed', label: 'Completed', icon: Archive, count: counts.completed },
    { id: 'all', label: 'All', icon: Users, count: counts.all }
  ];

  if (!canManage) {
    return (
      <div className="p-12 text-center">
        <div className="panel max-w-md mx-auto">
          <p className="text-sm text-red-400">Access denied. Receptionist role required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        <Loader className="animate-spin inline mr-2" />Loading quest applications...
      </div>
    );
  }

  const filteredApps = getFilteredApplications();

  return (
    <div className="space-y-8 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Quest Applications</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Full lifecycle view of all quest applications. Manage applicants through every stage.
        </p>
      </div>

      {/* Lifecycle Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto pb-px">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon size={12} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                activeTab === tab.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card-subtle)]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredApps.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === 'all' ? '' : activeTab} Applications`}
          description={`There are no ${activeTab === 'all' ? '' : activeTab} quest applications in this category.`}
          whyItMatters="Review applications to assign members to your quests."
          icon={<Compass size={22} />}
        />
      ) : (
        <div className="space-y-4">
          {/* Quest Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(groupedByQuest).map(([questId, apps]) => (
              <button
                key={questId}
                onClick={() => setSelectedQuestId(selectedQuestId === questId ? null : questId)}
                className={`panel p-3 text-left transition-all ${
                  selectedQuestId === questId
                    ? 'ring-2 ring-[var(--primary)]'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold truncate">
                      {apps[0]?.questTitle || 'Unknown Quest'}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {apps.length} application{apps.length > 1 ? 's' : ''} in {activeTab}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-[var(--text-muted)] transition-transform ${
                      selectedQuestId === questId ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Applications for Selected Quest */}
          {selectedQuestId && groupedByQuest[selectedQuestId] && (
            <div className="space-y-4 animate-fade-up">
              {groupedByQuest[selectedQuestId].map(app => {
                const statusInfo = getStatusDisplay(app.status);
                return (
                  <div key={app.id} className="panel p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-[var(--border)]">
                      <Link to={`/member/${app.applicantId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                          <User size={18} className="text-[var(--primary)]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">{app.applicantName || `User: ${app.applicantId.slice(0, 8)}`}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'recently'}
                          </div>
                        </div>
                      </Link>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Role Applied For */}
                    {app.roleTitle && (
                      <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">
                          Role Applied For
                        </div>
                        <div className="text-sm font-semibold text-purple-300">{app.roleTitle}</div>
                      </div>
                    )}

                    {/* Motivation */}
                    {app.motivation && (
                      <div className="mb-4">
                        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Send size={10} /> Motivation
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                          {app.motivation}
                        </p>
                      </div>
                    )}

                    {/* Experience */}
                    {app.experience && (
                      <div className="mb-4">
                        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Briefcase size={10} /> Experience
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                          {app.experience}
                        </p>
                      </div>
                    )}

                    {/* Portfolio Links */}
                    {app.portfolioLinks && app.portfolioLinks.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <BookOpen size={10} /> Portfolio Links
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {app.portfolioLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--primary)] hover:underline"
                            >
                              Link {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Answers */}
                    {app.customAnswers && Object.keys(app.customAnswers).length > 0 && (
                      <div className="mb-4 space-y-2">
                        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                          Additional Responses
                        </div>
                        {Object.entries(app.customAnswers).map(([question, answer]) => (
                          <div key={question} className="text-xs p-2 bg-[var(--bg-subtle)] rounded">
                            <div className="font-semibold text-[var(--text-muted)]">{question}</div>
                            <div className="text-[var(--text-secondary)]">{answer}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reviewer Notes (if already reviewed) */}
                    {app.reviewerNotes && (
                      <div className="mb-4 p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">
                          Reviewer Notes
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">{app.reviewerNotes}</p>
                      </div>
                    )}

                    {/* Actions - vary by status */}
                    {canManage && (
                      <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                        {/* Pending applications: Approve/Reject */}
                        {(app.status === 'submitted' || app.status === 'underReview' || app.status === 'draft') && (
                          <>
                            <button
                              onClick={() => setShowModal({ application: app, action: 'accept' })}
                              className="flex-1 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => setShowModal({ application: app, action: 'reject' })}
                              className="flex-1 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                        {/* Accepted applications: Mark Complete or Withdraw */}
                        {app.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => setShowModal({ application: app, action: 'complete' })}
                              className="flex-1 py-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Award size={14} /> Mark Complete
                            </button>
                            <button
                              onClick={() => setShowModal({ application: app, action: 'withdraw' })}
                              className="flex-1 py-2.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Undo2 size={14} /> Withdraw
                            </button>
                          </>
                        )}
                        {/* Rejected/Withdrawn: Re-open (allow re-review) */}
                        {(app.status === 'rejected' || app.status === 'withdrawn') && (
                          <button
                            onClick={() => setShowModal({ application: app, action: 'accept' })}
                            className="flex-1 py-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Undo2 size={14} /> Re-open
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              {showModal.action === 'accept' && <><CheckCircle size={20} className="text-emerald-400" /> Approve Application</>}
              {showModal.action === 'reject' && <><XCircle size={20} className="text-red-400" /> Reject Application</>}
              {showModal.action === 'complete' && <><Award size={20} className="text-purple-400" /> Mark Complete</>}
              {showModal.action === 'withdraw' && <><Undo2 size={20} className="text-slate-400" /> Withdraw Application</>}
            </h2>

            <div className="mb-4 p-3 rounded-lg bg-[var(--bg-subtle)] text-sm">
              <div className="font-semibold">{showModal.application.applicantName || showModal.application.applicantId.slice(0, 8)}</div>
              <div className="text-xs text-[var(--text-muted)]">{showModal.application.questTitle}</div>
              {showModal.application.roleTitle && (
                <div className="text-xs text-purple-400 mt-1">Role: {showModal.application.roleTitle}</div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Reviewer Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={
                  showModal.action === 'accept' ? 'Great fit for this quest!' :
                  showModal.action === 'reject' ? 'Please address the following concerns...' :
                  showModal.action === 'complete' ? 'Congratulations on completing this quest!' :
                  'Reason for withdrawal...'
                }
                className="text-sm min-h-[100px]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(null); setNotes(''); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--card-subtle)] border border-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={processing === showModal.application.id}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                  showModal.action === 'accept' ? 'bg-emerald-500 text-black' :
                  showModal.action === 'reject' ? 'bg-red-500 text-white' :
                  showModal.action === 'complete' ? 'bg-purple-500 text-white' :
                  'bg-slate-500 text-white'
                }`}
              >
                {processing === showModal.application.id ? (
                  <><Loader className="animate-spin" size={14} /> Processing...</>
                ) : showModal.action === 'accept' ? (
                  <><CheckCircle size={14} /> Confirm Approve</>
                ) : showModal.action === 'reject' ? (
                  <><XCircle size={14} /> Confirm Reject</>
                ) : showModal.action === 'complete' ? (
                  <><Award size={14} /> Confirm Complete</>
                ) : (
                  <><Undo2 size={14} /> Confirm Withdraw</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}