import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import type { Quest, QuestApplication, QuestParticipation, ParticipationStatus } from '../types/guild';
import { Compass, CheckCircle, Clock, ChevronRight, Award, Users, Target, Calendar, ExternalLink, FolderOpen, GitBranch, Wallet, FileText, BarChart3, History, Send, XCircle, PlayCircle, CheckSquare, Circle, Bell } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { getUserParticipations, getUserCompletedParticipations, getQuest, updateParticipationStatus, submitParticipationCompletion } from '../lib/repository';

interface QuestWithParticipation extends Quest {
  participation?: QuestParticipation;
  participationStatus?: ParticipationStatus;
}

// Time ago formatter - shows relative time like "2 hours ago", "3 days ago"
function timeAgo(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function MyQuests() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeQuests, setActiveQuests] = useState<QuestWithParticipation[]>([]);
  const [pendingApplications, setPendingApplications] = useState<QuestApplication[]>([]);
  const [completedQuests, setCompletedQuests] = useState<QuestParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<'overview' | 'workspace' | 'history'>('overview');

  const currentQuest = activeQuests.find(q => q.id === selectedQuestId);

  // Load quest data and set up auto-refresh
  useEffect(() => {
    if (!profile) return;

    async function loadMyQuests() {
      if (!profile) return;
      setLoading(true);
      try {
        console.log('[MyQuests] Starting load for user:', profile.uid);

        // 1. Fetch user's participations (source of truth for accepted quests)
        // Force fresh fetch by adding signal timestamp to prevent cache
        const participations = await getUserParticipations(profile.uid);
        console.log('[MyQuests] ===== TRACING ACCEPTANCE PIPELINE =====');
        console.log('[MyQuests] Fetched participations:', participations.length);
        console.log('[MyQuests] ALL Participation records:', participations.map(p => ({
          id: p.id,
          questId: p.questId,
          status: p.status,
          questTitle: p.questTitle,
          userId: p.userId
        })));

        // 2. Filter active vs completed (CRITICAL: include 'accepted' status for newly accepted quests)
        // NOTE: 'accepted' is the initial status set by createParticipation!
        const activeParts = participations.filter(p =>
          p.status && ['pending', 'accepted', 'active', 'inProgress', 'awaitingCompletionReview'].includes(p.status)
        );
        const completedParts = participations.filter(p => p.status === 'completed');

        console.log('[MyQuests] Active participations (after filter):', activeParts.length);
        console.log('[MyQuests] Active quest IDs:', activeParts.map(p => p.questId));

        // 3. Fetch quest details for each participation
        const activeQuestsData = await Promise.all(
          activeParts.map(async (part): Promise<QuestWithParticipation | null> => {
            const quest = await getQuest(part.questId);
            return quest ? { ...quest, participation: part, participationStatus: part.status } : null;
          })
        );

        const validActiveQuests = activeQuestsData.filter((q): q is QuestWithParticipation => q !== null);

        // 4. Fetch applications to check status
        const appQ = query(
          collection(db, 'questApplications'),
          where('applicantId', '==', profile.uid)
        );
        const appSnapshot = await getDocs(appQ);
        const userApplications = appSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestApplication));
        const activeQuestIds = new Set(activeParts.map(p => p.questId));
        console.log('[MyQuests] Active quest IDs from participations:', Array.from(activeQuestIds));

        // Also check for old accepted applications without participation records
        // This is a fallback in case createParticipation failed
        const acceptedApps = userApplications.filter(a =>
          a.status === 'accepted' && !activeQuestIds.has(a.questId)
        );

        console.log('[MyQuests] ALL user applications:', userApplications.map(a => ({
          id: a.id,
          questId: a.questId,
          status: a.status,
          questTitle: a.questTitle
        })));
        console.log('[MyQuests] Accepted applications without participation record:', acceptedApps.length);
        console.log('[MyQuests] Accepted apps questIds:', acceptedApps.map(a => a.questId));

        // Fetch quest details for old accepted apps
        if (acceptedApps.length > 0) {
          console.log('[MyQuests] Accepted apps found (showing as fallback):', acceptedApps.map(a => ({ id: a.id, questId: a.questId, title: a.questTitle })));
          const oldQuests = await Promise.all(
            acceptedApps.map(async (app): Promise<QuestWithParticipation | null> => {
              const quest = await getQuest(app.questId);
              if (!quest) {
                console.warn('[MyQuests] Quest not found for accepted app:', app.questId);
                return null;
              }
              return {
                ...quest,
                participation: undefined,
                participationStatus: 'accepted' as const,
              };
            })
          );
          const validOldQuests = oldQuests.filter((q): q is QuestWithParticipation => q !== null);
          if (validOldQuests.length > 0) {
            console.log('[MyQuests] Adding accepted applications as fallback quests:', validOldQuests.map(q => q.title));
            validActiveQuests.push(...validOldQuests);
          }
        }

        setActiveQuests(validActiveQuests);
        setCompletedQuests(completedParts);

        // CRITICAL FIX: Correct the pending logic
        // Pending = applications where user is STILL WAITING for a decision
        // NOT 'accepted' (we have a decision!)
        // Also exclude applications that already have participation (handled in activeQuests)
        const pending = userApplications.filter(a => {
          const hasParticipation = activeQuestIds.has(a.questId);
          const isAccepted = a.status === 'accepted';

          // DEBUG: Log each application decision
          console.log(`[MyQuests] Filtering app ${a.questTitle}:`, {
            status: a.status,
            hasParticipation,
            includeInPending: !isAccepted && !hasParticipation && !['completed', 'withdrawn', 'rejected'].includes(a.status)
          });

          // Exclude accepted applications WITH participation - those show in Active Assignments
          if (a.status === 'accepted' && activeQuestIds.has(a.questId)) return false;
          // Exclude applications that are accepted but missing participation (fallback shows as Active)
          if (a.status === 'accepted' && !activeQuestIds.has(a.questId)) return false;
          // Exclude completed/withdrawn/rejected applications
          if (a.status === 'completed' || a.status === 'withdrawn' || a.status === 'rejected') return false;
          // Include only truly pending applications (submitted/underReview/draft)
          return (a.status === 'submitted' || a.status === 'underReview' || a.status === 'draft');
        });

        console.log('[MyQuests] ===== DISPLAY STATE =====');
        console.log('[MyQuests] Active Assignments (from participation):', validActiveQuests.map(q => ({ id: q.id, title: q.title, status: q.participationStatus })));
        console.log('[MyQuests] Pending Applications (still waiting):', pending.map(a => ({ id: a.id, title: a.questTitle, status: a.status })));
        console.log('[MyQuests] ===== END PIPELINE TRACE =====');

        setPendingApplications(pending);

      } catch (err) {
        console.error('[MyQuests] Error loading:', err);
      } finally {
        setLoading(false);
      }
    }

    // Initial load - double refresh to ensure we catch recently accepted applications
    loadMyQuests();

    // Immediate second refresh after 2 seconds to catch any pending writes
    const initialRefresh = setTimeout(loadMyQuests, 2000);

    // Auto-refresh every 30 seconds to catch new acceptances
    const interval = setInterval(loadMyQuests, 30000);

    // Refresh when page becomes visible again (user returns from notification or switches tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[MyQuests] Page became visible - refreshing data');
        loadMyQuests();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      clearTimeout(initialRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile, selectedQuestId, workspaceView]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        Loading your quest workspace...
      </div>
    );
  }

  // Use participation as source of truth
  const userId = profile?.uid || '';

  // Group active quests by type for workspace
  const standardQuests = activeQuests.filter(q => q.questType !== 'openSource');
  const openSourceQuests = activeQuests.filter(q => q.questType === 'openSource');

  // Determine if we should show workspace (multiple active quests)
  const showWorkspace = activeQuests.length > 1;

  // Combined counts
  const totalActive = activeQuests.length;
  const totalPending = pendingApplications.length;
  const totalCompleted = completedQuests.length;

  return (
    <div className="space-y-8 py-4 text-left max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">My Quests</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track your quest applications, active assignments, and completed work.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-sm btn-outline flex items-center gap-1"
            title="Refresh data"
          >
            <History size={14} />
          </button>
          <button
            onClick={() => setWorkspaceView(workspaceView === 'history' ? 'overview' : 'history')}
            className="btn btn-sm btn-outline flex items-center gap-1"
          >
            {workspaceView === 'history' ? 'Back to Active' : 'Quest History'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel text-center">
          <div className="text-2xl font-black text-amber-400">{totalPending}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Pending</div>
        </div>
        <div className="panel text-center">
          <div className="text-2xl font-black text-[var(--primary)]">{totalActive}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Active</div>
        </div>
        <div className="panel text-center">
          <div className="text-2xl font-black text-emerald-400">{totalCompleted}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Completed</div>
        </div>
      </div>

      {workspaceView === 'history' ? (
        <QuestHistory completedQuests={completedQuests} />
      ) : totalActive === 0 && totalPending === 0 ? (
        <EmptyState
          title="No Quest Applications"
          description="You haven't applied for any quests yet. Browse the Quest Board to find opportunities."
          whyItMatters="Quests help you gain experience and reputation to grow your rank within the guild."
          actionText="Browse Quests"
          onAction={() => { window.location.href = '/quests'; }}
          icon={<Compass size={22} />}
        />
      ) : showWorkspace ? (
        /* WORKSPACE VIEW - Multiple active quests */
        <div className="grid grid-cols-4 gap-4">
          {/* Sidebar - Quest Switcher */}
          <div className="col-span-1 space-y-4">
            <div className="panel p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Switch Quest Workspace
              </h3>

              {/* Standard Quests Section */}
              {standardQuests.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                    <Target size={10} /> STANDARD
                  </div>
                  {standardQuests.map(q => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedQuestId(q.id);
                        setWorkspaceView('workspace');
                      }}
                      className={`w-full text-left p-2 rounded text-xs transition-all ${
                        selectedQuestId === q.id
                          ? 'bg-[var(--primary)] text-white'
                          : 'hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="font-bold truncate">{q.title}</div>
                      <div className="text-[10px] opacity-70">
                        {q.category} • {q.difficulty}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Open Source Quests Section */}
              {openSourceQuests.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                    <GitBranch size={10} /> OPEN SOURCE
                  </div>
                  {openSourceQuests.map(q => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedQuestId(q.id);
                        setWorkspaceView('workspace');
                      }}
                      className={`w-full text-left p-2 rounded text-xs transition-all ${
                        selectedQuestId === q.id
                          ? 'bg-purple-500 text-white'
                          : 'hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="font-bold truncate">{q.title}</div>
                      <div className="text-[10px] opacity-70">
                        {q.openSourceConfig?.teamRoles?.length || 0} roles • Mission
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Back to Overview */}
            <button
              onClick={() => setWorkspaceView('overview')}
              className="w-full panel p-3 text-left text-xs hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-2"
            >
              <FolderOpen size={14} /> Back to Overview
            </button>
          </div>

          {/* Main Workspace Area */}
          <div className="col-span-3">
            {workspaceView === 'workspace' && currentQuest ? (
              currentQuest.questType === 'openSource' ? (
                <OpenSourceWorkspace quest={currentQuest} participation={currentQuest.participation} userId={profile?.uid || ''} />
              ) : (
                <StandardQuestWorkspace quest={currentQuest} participation={currentQuest.participation} userId={profile?.uid || ''} />
              )
            ) : (
              <QuestOverviewList activeQuests={activeQuests} pendingApps={pendingApplications} />
            )}
          </div>
        </div>
      ) : activeQuests.length === 1 ? (
        /* Single active quest - go directly to its workspace */
        activeQuests[0].questType === 'openSource' ? (
          <OpenSourceWorkspace quest={activeQuests[0]} participation={activeQuests[0].participation} userId={profile?.uid || ''} />
        ) : (
          <StandardQuestWorkspace quest={activeQuests[0]} participation={activeQuests[0].participation} userId={profile?.uid || ''} />
        )
      ) : (
        /* No active quests - show list */
        <QuestOverviewList activeQuests={activeQuests} pendingApps={pendingApplications} />
      )}
    </div>
  );
}

// Quest Overview List Component
// Helper to get next action label based on status
function getNextAction(appStatus?: string, partStatus?: string): string | null {
  // Application statuses
  if (appStatus === 'draft') return 'Complete Application';
  if (appStatus === 'submitted') return 'Application Under Review';
  if (appStatus === 'underReview') return 'Waiting For Approval';

  // Participation statuses
  if (partStatus === 'pending') return 'Pending Acceptance';
  if (partStatus === 'accepted') return 'Start Quest Work';
  if (partStatus === 'active') return 'Continue Quest Work';
  if (partStatus === 'inProgress') return 'Submit Completion Report';
  if (partStatus === 'awaitingCompletionReview') return 'Awaiting Completion Review';
  if (partStatus === 'completed') return null;
  if (partStatus === 'rejected') return 'View Feedback';
  if (partStatus === 'withdrawn') return 'Apply for Another Quest';

  return null;
}

function QuestOverviewList({
  activeQuests = [],
  pendingApps = [],
  completedParts = []
}: {
  activeQuests?: QuestWithParticipation[];
  pendingApps?: QuestApplication[];
  completedParts?: QuestParticipation[];
}) {
  const allActiveQuests = activeQuests || [];
  const allPendingApps = pendingApps || [];
  const allCompleted = completedParts || [];

  return (
    <div className="space-y-6">
      {allPendingApps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Clock size={14} /> Pending Applications
          </h2>
          <div className="space-y-2">
            {allPendingApps.map(app => (
              <Link key={app.id} to={`/quests/${app.questId}`} className="panel flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                <div>
                  <div className="text-sm font-bold">{app.questTitle}</div>
                  <div className="text-[10px] text-amber-400 mt-1">
                    NEXT: {getNextAction(app.status) || app.status}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {allActiveQuests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--primary)] flex items-center gap-2">
            <Compass size={14} /> Active Assignments
          </h2>
          <div className="space-y-2">
            {allActiveQuests.map(q => {
              const nextAction = getNextAction(undefined, q.participation?.status);
              return (
                <Link key={q.id} to={`/my-quests/${q.id}`} className="panel flex items-center justify-between p-4 hover:shadow-md transition-shadow border-l-2 border-[var(--primary)]">
                  <div>
                    <div className="text-sm font-bold">{q.title}</div>
                    {nextAction && (
                      <div className="text-[10px] text-blue-400 mt-1">
                        NEXT: {nextAction}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {q.estimatedHours || 12} hours • +{q.reputationPoints} Rep
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)]" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {allCompleted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <Award size={14} /> Completed
          </h2>
          <div className="space-y-2">
            {allCompleted.map(p => (
              <div key={p.id} className="panel flex items-center justify-between p-4 opacity-70">
                <div>
                  <div className="text-sm font-bold">{p.questTitle}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Completed: {timeAgo(p.completedAt)}
                  </div>
                </div>
                <CheckCircle size={16} className="text-emerald-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Quest History Component - shows completed quests
function QuestHistory({ completedQuests }: { completedQuests: QuestParticipation[] }) {
  if (completedQuests.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <History size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
        <h3 className="text-lg font-bold mb-2">No Completed Quests</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Quests you've completed will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <History size={20} /> Quest History
      </h2>
      <div className="space-y-3">
        {completedQuests.map(p => (
          <div key={p.id} className="panel p-4 opacity-80">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{p.questTitle}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Role: {p.roleTitle || 'Member'} • Completed: {timeAgo(p.completedAt)}
                </div>
              </div>
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            {p.report && (
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                <span className="font-bold">Summary:</span> {p.summary || p.report.substring(0, 100)}...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Standard Quest Workspace Component
function StandardQuestWorkspace({ quest, participation, userId }: { quest: Quest; participation?: QuestParticipation; userId: string }) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionReport, setCompletionReport] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = participation && ['accepted', 'active', 'inProgress'].includes(participation.status);
  const isAwaitingReview = participation?.status === 'awaitingCompletionReview';

  async function handleSubmitCompletion() {
    if (!participation || !completionReport.trim()) return;
    setSubmitting(true);
    try {
      await submitParticipationCompletion(participation.id, { report: completionReport }, userId);
      setShowCompleteModal(false);
      window.location.reload();
    } catch (err) {
      console.error('[MyQuests] Error submitting completion:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="panel p-4 border-l-4 border-[var(--primary)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
              <Target size={12} /> Standard Quest
            </div>
            <h2 className="text-lg font-black">{quest.title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">{quest.category} • {quest.difficulty}</p>
          </div>
          <Link
            to={`/quests/${quest.id}`}
            className="btn btn-sm btn-primary flex items-center gap-1"
          >
            <ExternalLink size={12} /> View Details
          </Link>
        </div>
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-1">ESTIMATED HOURS</div>
          <div className="font-bold">{quest.estimatedHours || 12} hrs</div>
        </div>
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-1">REPUTATION</div>
          <div className="font-bold text-amber-400">+{quest.reputationPoints}</div>
        </div>
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-1">DIFFICULTY</div>
          <div className="font-bold capitalize">{quest.difficulty}</div>
        </div>
      </div>

      {/* Deadline */}
      {quest.requiredSkills && quest.requiredSkills.length > 0 && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2">REQUIRED SKILLS</div>
          <div className="flex flex-wrap gap-1">
            {quest.requiredSkills.map(skill => (
              <span key={skill} className="badge badge-amber">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rewards */}
      <div className="panel p-4">
        <div className="text-[10px] text-[var(--text-muted)] mb-2">REWARDS</div>
        <p className="text-sm">{quest.rewards}</p>
        {quest.experienceReward && (
          <div className="mt-2 text-xs text-[var(--primary)]">
            +{quest.experienceReward} XP
          </div>
        )}
      </div>

      {/* Expected Outcome */}
      {quest.expectedOutcome && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2">EXPECTED OUTCOME</div>
          <p className="text-sm">{quest.expectedOutcome}</p>
        </div>
      )}

      {/* Completion Workflow */}
      <div className="panel p-4">
        <div className="text-[10px] text-[var(--text-muted)] mb-3">QUEST ACTIONS</div>

        {isAwaitingReview ? (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg">
            <Clock size={16} className="text-amber-400" />
            <span className="text-sm">Awaiting completion review</span>
          </div>
        ) : canSubmit ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Ready to submit your completion report? Your work will be reviewed by a guild administrator.
            </p>
            <button
              onClick={() => setShowCompleteModal(true)}
              className="btn btn-sm btn-primary flex items-center gap-1"
            >
              <Send size={14} /> Submit Completion Report
            </button>
          </div>
        ) : participation?.status === 'pending' ? (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
            <Clock size={16} className="text-blue-400" />
            <span className="text-sm">Pending acceptance</span>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)]">
            Status: {participation?.status || 'Unknown'}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel max-w-lg w-full p-6 animate-fade-up">
            <h3 className="text-lg font-bold mb-4">Submit Completion Report</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Describe your completed work and achievements. This will be reviewed by a guild administrator.
            </p>
            <textarea
              value={completionReport}
              onChange={(e) => setCompletionReport(e.target.value)}
              placeholder="Describe what you accomplished..."
              className="w-full h-40 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-sm resize-none"
            />
            <div className="p-2 bg-amber-500/10 rounded text-xs text-amber-400 mb-3">
              WARNING: Once submitted, your report enters review. This action cannot be undone.
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowCompleteModal(false); setCompletionReport(''); }}
                className="btn btn-sm btn-outline flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCompletion}
                className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-1"
                disabled={submitting || !completionReport.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Open Source Quest Workspace Component
function OpenSourceWorkspace({ quest, participation, userId }: { quest: Quest; participation?: QuestParticipation; userId: string }) {
  const config = quest.openSourceConfig;
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionReport, setCompletionReport] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = participation && ['accepted', 'active', 'inProgress'].includes(participation.status);
  const isAwaitingReview = participation?.status === 'awaitingCompletionReview';

  async function handleSubmitCompletion() {
    if (!participation || !completionReport.trim()) return;
    setSubmitting(true);
    try {
      await submitParticipationCompletion(participation.id, { report: completionReport }, userId);
      setShowCompleteModal(false);
      window.location.reload();
    } catch (err) {
      console.error('[MyQuests] OSQ Error submitting completion:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="panel p-4 border-l-4 border-purple-500">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-purple-400 mb-1">
              <GitBranch size={12} /> Open Source Quest
            </div>
            <h2 className="text-lg font-black">{quest.title}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">{quest.category} • {quest.difficulty}</p>
          </div>
          <Link
            to={`/quests/${quest.id}`}
            className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1"
          >
            <ExternalLink size={12} /> View Details
          </Link>
        </div>
      </div>

      {/* Mission */}
      {config?.mission && (
        <div className="panel p-4 bg-purple-500/10">
          <div className="text-[10px] text-purple-400 mb-2 flex items-center gap-1">
            <Target size={12} /> MISSION
          </div>
          <p className="text-sm">{config.mission}</p>
        </div>
      )}

      {/* Goals */}
      {config?.goals && config.goals.length > 0 && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2">GOALS</div>
          <ul className="space-y-1">
            {config.goals.map((goal, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Team Roles */}
      {config?.teamRoles && config.teamRoles.length > 0 && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Users size={12} /> TEAM ROLES ({config.teamRoles.length})
          </div>
          <div className="space-y-2">
            {config.teamRoles.map(role => (
              <div key={role.id} className="text-xs p-2 bg-[var(--bg-subtle)] rounded">
                <div className="font-bold">{role.title}</div>
                <div className="text-[var(--text-muted)]">{role.description}</div>
                <div className="mt-1 text-purple-400">
                  {role.openPositions} positions • {role.skillsRequired?.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Workspace - Milestones */}
      {config?.teamWorkspace?.milestones && config.teamWorkspace.milestones.length > 0 && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <CheckSquare size={12} /> MILESTONES ({config.teamWorkspace.milestones.filter(m => m.status === 'completed').length}/{config.teamWorkspace.milestones.length})
          </div>
          <div className="space-y-2">
            {config.teamWorkspace.milestones.slice(0, 5).map((milestone, i) => (
              <div key={i} className={`text-xs p-2 rounded flex items-start gap-2 ${
                milestone.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                milestone.status === 'inProgress' ? 'bg-blue-500/10 text-blue-400' :
                'bg-[var(--bg-subtle)]'
              }`}>
                {milestone.status === 'completed' ? <CheckCircle size={12} className="mt-0.5" /> :
                 milestone.status === 'inProgress' ? <Clock size={12} className="mt-0.5" /> :
                 <Circle size={12} className="mt-0.5 text-[var(--text-muted)]" />}
                <div>
                  <div className="font-bold">{milestone.title}</div>
                  {milestone.dueDate && (
                    <div className="text-[10px] opacity-70">Due: {new Date(milestone.dueDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))}
            {config.teamWorkspace.milestones.length > 5 && (
              <Link to={`/my-quests/${quest.id}`} className="text-xs text-purple-400 hover:underline">
                +{config.teamWorkspace.milestones.length - 5} more milestones
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Team Workspace - Announcements */}
      {config?.teamWorkspace?.announcements && config.teamWorkspace.announcements.length > 0 && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Bell size={12} /> TEAM ANNOUNCEMENTS ({config.teamWorkspace.announcements.length})
          </div>
          <div className="space-y-2">
            {config.teamWorkspace.announcements.slice(0, 3).map((announcement, i) => (
              <div key={i} className="text-xs p-2 bg-[var(--bg-subtle)] rounded">
                <div className="font-bold">{announcement.title}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{announcement.content}</div>
              </div>
            ))}
            {config.teamWorkspace.announcements.length > 3 && (
              <Link to={`/my-quests/${quest.id}`} className="text-xs text-purple-400 hover:underline">
                +{config.teamWorkspace.announcements.length - 3} more announcements
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Rewards */}
      <div className="panel p-4">
        <div className="text-[10px] text-[var(--text-muted)] mb-2">REWARDS</div>
        <p className="text-sm">{quest.rewards}</p>
        <div className="mt-2 flex gap-3 text-xs">
          <span className="text-amber-400">+{quest.reputationPoints} Rep</span>
          {quest.experienceReward && (
            <span className="text-purple-400">+{quest.experienceReward} XP</span>
          )}
        </div>
      </div>

      {/* Fundraising with Progress & Contributions */}
      {config?.fundraisingGoal && (
        <div className="panel p-3">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Wallet size={12} /> FUNDRAISING
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{
                  width: `${Math.min(100, (config.fundsRaised || 0) / config.fundraisingGoal * 100)}%`
                }}
              />
            </div>
            <span className="text-xs font-bold">
              {config.fundraisingCurrency || '$'}{config.fundsRaised || 0} / {config.fundraisingGoal}
            </span>
          </div>
          {/* Show recent contributions */}
          {config.contributions && config.contributions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-[var(--text-muted)]">Recent Contributors</div>
              {config.contributions.slice(0, 3).map((contrib, i) => (
                <div key={i} className="text-xs flex justify-between items-center p-1 bg-[var(--bg-subtle)] rounded">
                  <span>{contrib.contributorName}</span>
                  <span className="text-green-400 font-bold">{config.fundraisingCurrency || '$'}{contrib.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completion Workflow */}
      <div className="panel p-4">
        <div className="text-[10px] text-[var(--text-muted)] mb-3">QUEST ACTIONS</div>

        {isAwaitingReview ? (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg">
            <Clock size={16} className="text-amber-400" />
            <span className="text-sm">Awaiting completion review</span>
          </div>
        ) : canSubmit ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Ready to submit your completion report? Your work will be reviewed by a guild administrator.
            </p>
            <button
              onClick={() => setShowCompleteModal(true)}
              className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1"
            >
              <Send size={14} /> Submit Completion Report
            </button>
          </div>
        ) : participation?.status === 'pending' ? (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
            <Clock size={16} className="text-blue-400" />
            <span className="text-sm">Pending acceptance</span>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)]">
            Status: {participation?.status || 'Unknown'}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel max-w-lg w-full p-6 animate-fade-up">
            <h3 className="text-lg font-bold mb-4">Submit Completion Report</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Describe your completed work and achievements. This will be reviewed by a guild administrator.
            </p>
            <textarea
              value={completionReport}
              onChange={(e) => setCompletionReport(e.target.value)}
              placeholder="Describe what you accomplished..."
              className="w-full h-40 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-sm resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="btn btn-sm btn-outline flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCompletion}
                className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white flex-1 flex items-center justify-center gap-1"
                disabled={submitting || !completionReport.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}