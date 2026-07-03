import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Quest, QuestParticipation, ParticipationStatus } from '../types/guild';
import { getQuest, getUserQuestParticipation, submitParticipationCompletion, withdrawParticipation, getQuestParticipations } from '../lib/repository';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Compass, ChevronLeft, CheckCircle, Clock, Send, XCircle, ExternalLink,
  Target, Award, Calendar, FileText, PlayCircle, AlertCircle, Users, User, Shield
} from 'lucide-react';

// Time ago formatter
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

export default function MyQuestWorkspace() {
  const { questId } = useParams<{ questId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [quest, setQuest] = useState<Quest | null>(null);
  const [participation, setParticipation] = useState<QuestParticipation | null>(null);
  const [teamMembers, setTeamMembers] = useState<QuestParticipation[]>([]);
  const [questCreator, setQuestCreator] = useState<{ fullName: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [completionReport, setCompletionReport] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    async function loadWorkspace() {
      if (!questId || !profile) {
        setLoading(false);
        return;
      }

      try {
        const [questData, partData, allParticipants] = await Promise.all([
          getQuest(questId),
          getUserQuestParticipation(profile.uid, questId),
          getQuestParticipations(questId)
        ]);

        if (questData) {
          setQuest(questData);
          setParticipation(partData);

          // Get active team members (accepted, active, inProgress)
          const activeMembers = allParticipants.filter(p =>
            ['accepted', 'active', 'inProgress', 'awaitingCompletionReview'].includes(p.status)
          );
          setTeamMembers(activeMembers);

          // Load quest creator info
          if (questData.createdBy) {
            try {
              const creatorDoc = await getDoc(doc(db, 'users', questData.createdBy));
              if (creatorDoc.exists()) {
                const data = creatorDoc.data();
                setQuestCreator({ fullName: data.fullName, role: data.role });
              }
            } catch (e) {
              console.warn('[MyQuestWorkspace] Error loading creator:', e);
            }
          }
        } else {
          console.warn('[MyQuestWorkspace] Quest not found:', questId);
        }
      } catch (err) {
        console.error('[MyQuestWorkspace] Error loading:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, [questId, profile]);

  const canSubmit = participation && ['accepted', 'active', 'inProgress'].includes(participation.status);
  const isAwaitingReview = participation?.status === 'awaitingCompletionReview';

  async function handleSubmitCompletion() {
    if (!participation || !completionReport.trim() || !profile) return;
    setSubmitting(true);
    try {
      // SIMPLE: Save report directly to Firestore
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await setDoc(doc(db, 'questSubmissions', submissionId), {
        id: submissionId,
        questId: participation.questId,
        questTitle: participation.questTitle,
        memberId: profile.uid,
        memberName: profile.fullName,
        report: completionReport,  // <-- THE TEXT USER TYPED
        status: 'pending',
        archiveStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update participation status
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'questParticipations', participation.id), {
        status: 'awaitingCompletionReview',
        submittedAt: new Date().toISOString()
      });

      setShowCompleteModal(false);
      navigate('/my-quests');
    } catch (err) {
      console.error('[MyQuestWorkspace] Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!participation || !profile) return;
    setWithdrawing(true);
    try {
      await withdrawParticipation(participation.id, profile.uid);
      navigate('/my-quests');
    } catch (err) {
      console.error('[MyQuestWorkspace] Error withdrawing:', err);
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        Loading workspace...
      </div>
    );
  }

  if (!quest || !participation) {
    // Redirect to MyQuests if no valid participation
    return (
      <Navigate to="/my-quests" replace />
    );
  }

  return (
    <div className="space-y-6 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/my-quests"
          className="p-2 rounded-lg hover:bg-[var(--card-subtle)] transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black">{quest.title}</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {quest.category} • {quest.difficulty} • {quest.questType || 'Standard'}
          </p>
        </div>
        <Link
          to={`/quests/${quest.id}`}
          className="btn btn-sm btn-outline flex items-center gap-1"
        >
          <ExternalLink size={14} /> Quest Details
        </Link>
      </div>

      {/* Status Banner */}
      <div className={`panel p-4 ${
        participation.status === 'completed' ? 'border-l-4 border-emerald-400' :
        participation.status === 'awaitingCompletionReview' ? 'border-l-4 border-amber-400' :
        participation.status === 'inProgress' ? 'border-l-4 border-blue-400' :
        'border-l-4 border-[var(--primary)]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {participation.status === 'completed' ? (
              <CheckCircle size={24} className="text-emerald-400" />
            ) : participation.status === 'awaitingCompletionReview' ? (
              <Clock size={24} className="text-amber-400" />
            ) : (
              <PlayCircle size={24} className="text-[var(--primary)]" />
            )}
            <div>
              <div className="text-sm font-bold capitalize">
                {participation.status === 'inProgress' ? 'In Progress' :
                 participation.status === 'awaitingCompletionReview' ? 'Awaiting Review' :
                 participation.status}
              </div>
              {participation.acceptedAt && (
                <div className="text-[10px] text-[var(--text-muted)]">
                  Accepted: {timeAgo(participation.acceptedAt)}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isAwaitingReview ? (
            <div className="text-xs text-amber-400">
              Completion pending review
            </div>
          ) : canSubmit ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="btn btn-sm btn-outline text-red-400 hover:bg-red-400/10"
              >
                Withdraw
              </button>
              <button
                onClick={() => setShowCompleteModal(true)}
                className="btn btn-sm btn-primary flex items-center gap-1"
              >
                <Send size={14} /> Submit
              </button>
            </div>
          ) : participation.status === 'pending' ? (
            <div className="text-xs text-blue-400">
              Awaiting acceptance
            </div>
          ) : null}
        </div>
      </div>

      {/* Quest Creator & Team Info */}
      <div className="panel p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Quest Creator */}
          {questCreator && (
            <div>
              <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
                <Shield size={12} /> QUEST CREATED BY
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold">{questCreator.fullName}</div>
                <div className="text-[10px] text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded">
                  {questCreator.role}
                </div>
              </div>
            </div>
          )}

          {/* Team Members */}
          <div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <Users size={12} /> TEAM MEMBERS ({teamMembers.length})
            </div>
            {teamMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-1 text-xs bg-[var(--card-subtle)] px-2 py-1 rounded">
                    <User size={12} />
                    <span className="font-medium">{member.userName || member.applicantName}</span>
                    <span className="text-[var(--text-muted)]">
                      {member.roleTitle || member.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)]">No team members yet</div>
            )}
          </div>
        </div>

        {/* Receptionist Info */}
        {(quest as any).assignedReceptionistId && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <Award size={12} /> RECEPTIONIST
            </div>
            <div className="text-sm">
              {(quest as any).assignedReceptionistName || 'Assigned'}
            </div>
          </div>
        )}
      </div>

      {/* Quest Details */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Clock size={12} /> ESTIMATED HOURS
          </div>
          <div className="text-xl font-black">{quest.estimatedHours || 12}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Award size={12} /> REPUTATION
          </div>
          <div className="text-xl font-black text-amber-400">+{quest.reputationPoints}</div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Target size={12} /> DIFFICULTY
          </div>
          <div className="text-xl font-black capitalize">{quest.difficulty}</div>
        </div>
      </div>

      {/* Description */}
      {quest.description && (
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2">QUEST DESCRIPTION</div>
          <p className="text-sm whitespace-pre-wrap">{quest.description}</p>
        </div>
      )}

      {/* Expected Outcome */}
      {quest.expectedOutcome && (
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2">EXPECTED OUTCOME</div>
          <p className="text-sm">{quest.expectedOutcome}</p>
        </div>
      )}

      {/* Rewards */}
      {quest.rewards && (
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <Award size={12} /> REWARDS
          </div>
          <p className="text-sm">{quest.rewards}</p>
          {quest.experienceReward && (
            <div className="mt-2 text-sm text-[var(--primary)]">
              +{quest.experienceReward} XP
            </div>
          )}
        </div>
      )}

      {/* Completion Report (if submitted) */}
      {participation.report && (
        <div className="panel p-4">
          <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <FileText size={12} /> YOUR SUBMISSION
          </div>
          <p className="text-sm whitespace-pre-wrap">{participation.report}</p>
          {participation.submittedAt && (
            <div className="mt-2 text-[10px] text-[var(--text-muted)]">
              Submitted: {timeAgo(participation.submittedAt)}
            </div>
          )}
        </div>
      )}

      {/* Reviewer Notes (if reviewed) */}
      {participation.reviewerNotes && (
        <div className="panel p-4 bg-emerald-500/10">
          <div className="text-[10px] text-emerald-400 mb-2">REVIEWER FEEDBACK</div>
          <p className="text-sm">{participation.reviewerNotes}</p>
        </div>
      )}

      {/* Completion Modal - Step 1: Enter Report */}
      {showCompleteModal && !showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel max-w-lg w-full p-6 animate-fade-up">
            <h3 className="text-lg font-bold mb-4">Submit Completion Report</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Describe your completed work and achievements. This will be reviewed by a guild administrator.
            </p>
            <textarea
              value={completionReport}
              onChange={(e) => setCompletionReport(e.target.value)}
              placeholder="Describe what you accomplished, challenges you overcame, and lessons learned..."
              className="w-full h-40 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-sm resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowCompleteModal(false); setCompletionReport(''); }}
                className="btn btn-sm btn-outline flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-1"
                disabled={!completionReport.trim()}
              >
                Review & Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal - Step 2: Confirm Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel max-w-lg w-full p-6 animate-fade-up border-2 border-amber-400">
            <h3 className="text-lg font-bold mb-2">Confirm Submission</h3>
            <div className="p-3 bg-amber-500/10 rounded-lg mb-4">
              <p className="text-xs text-amber-400 font-bold mb-1">WARNING</p>
              <p className="text-xs">
                Once submitted, your completion report will enter review. You cannot undo this action.
              </p>
            </div>
            <div className="text-sm mb-4">
              <div className="text-xs text-[var(--text-muted)] mb-1">Quest:</div>
              <div className="font-bold">{quest?.title}</div>
            </div>
            <div className="text-sm mb-4">
              <div className="text-xs text-[var(--text-muted)] mb-1">Your Report:</div>
              <div className="text-xs p-2 bg-[var(--bg-subtle)] rounded max-h-24 overflow-y-auto">
                {completionReport.slice(0, 200)}{completionReport.length > 200 ? '...' : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-sm btn-outline flex-1"
                disabled={submitting}
              >
                Back
              </button>
              <button
                onClick={handleSubmitCompletion}
                className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-1"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel max-w-md w-full p-6 animate-fade-up">
            <h3 className="text-lg font-bold mb-2">Withdraw from Quest?</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Are you sure you want to withdraw? This action cannot be undone and you may need to reapply to participate.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="btn btn-sm btn-outline flex-1"
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                className="btn btn-sm bg-red-500 hover:bg-red-600 text-white flex-1"
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}