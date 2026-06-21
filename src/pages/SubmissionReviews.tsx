import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Quest, QuestParticipation } from '../types/guild';
import {
  getQuestsAwaitingCompletion,
  completeParticipation,
  rejectParticipationCompletion,
  getQuest
} from '../lib/repository';
import { Link } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, ChevronRight, FileText, Search, AlertCircle
} from 'lucide-react';

export default function SubmissionReviews() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<QuestParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuestParticipation | null>(null);
  const [questDetails, setQuestDetails] = useState<Quest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [showRejectError, setShowRejectError] = useState(false);

  useEffect(() => {
    async function loadSubmissions() {
      if (!profile) return;
      try {
        const data = await getQuestsAwaitingCompletion();
        setSubmissions(data);
      } catch (err) {
        console.error('[SubmissionReviews] Error loading:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubmissions();
  }, [profile]);

  async function selectSubmission(submission: QuestParticipation) {
    setSelected(submission);
    setReviewNotes('');
    try {
      const quest = await getQuest(submission.questId);
      setQuestDetails(quest);
    } catch (err) {
      console.error('[SubmissionReviews] Error loading quest:', err);
    }
  }

  async function handleApprove() {
    if (!selected || !profile) return;
    setReviewing(true);
    try {
      await completeParticipation(selected.id, profile.uid, reviewNotes);
      setSubmissions(prev => prev.filter(s => s.id !== selected.id));
      setSelected(null);
      setQuestDetails(null);
    } catch (err) {
      console.error('[SubmissionReviews] Error approving:', err);
    } finally {
      setReviewing(false);
    }
  }

  async function handleReject() {
    if (!selected || !profile) {
      setShowRejectError(true);
      return;
    }
    if (!reviewNotes.trim()) {
      setShowRejectError(true);
      return;
    }
    setReviewing(true);
    setShowRejectError(false);
    try {
      await rejectParticipationCompletion(selected.id, profile.uid, reviewNotes);
      setSubmissions(prev => prev.filter(s => s.id !== selected.id));
      setSelected(null);
      setQuestDetails(null);
    } catch (err) {
      console.error('[SubmissionReviews] Error rejecting:', err);
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        Loading submissions...
      </div>
    );
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'awaitingCompletionReview');
  const displaySubmissions = filter === 'pending' ? pendingSubmissions : submissions;

  return (
    <div className="space-y-6 py-4 text-left max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Submission Reviews</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review quest completion reports from participants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Clock size={14} /> Pending ({pendingSubmissions.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            <FileText size={14} /> All ({submissions.length})
          </button>
        </div>
      </div>

      {displaySubmissions.length === 0 ? (
        <div className="panel p-12 text-center">
          <AlertCircle size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-bold mb-2">No Pending Reviews</h3>
          <p className="text-sm text-[var(--text-muted)]">
            There are no completion reports waiting for your review.
          </p>
        </div>
      ) : selected ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Submissions List */}
          <div className="col-span-1 space-y-3">
            <div className="panel p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Pending Submissions
              </h3>
              <div className="space-y-2">
                {displaySubmissions.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selected.id === sub.id
                        ? 'bg-[var(--primary)] text-white'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="font-bold text-sm truncate">{sub.questTitle}</div>
                    <div className="text-[10px] opacity-70">
                      {sub.userName || sub.applicantId} • {sub.roleTitle || 'Member'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full panel p-3 text-left text-xs hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-2"
            >
              <ChevronRight size={14} className="rotate-180" /> Back to List
            </button>
          </div>

          {/* Review Details */}
          <div className="col-span-2 space-y-4">
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black">{selected.questTitle}</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Submitted by {selected.userName || selected.applicantId}
                  </p>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Role: {selected.roleTitle || 'Member'}
                </div>
              </div>

              {/* Quest Info */}
              {questDetails && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="panel p-2">
                    <div className="text-[10px] text-[var(--text-muted)]">CATEGORY</div>
                    <div className="text-sm font-bold">{questDetails.category}</div>
                  </div>
                  <div className="panel p-2">
                    <div className="text-[10px] text-[var(--text-muted)]">DIFFICULTY</div>
                    <div className="text-sm font-bold capitalize">{questDetails.difficulty}</div>
                  </div>
                  <div className="panel p-2">
                    <div className="text-[10px] text-[var(--text-muted)]">REPUTATION</div>
                    <div className="text-sm font-bold text-amber-400">+{questDetails.reputationPoints}</div>
                  </div>
                </div>
              )}

              {/* Submission Report */}
              <div className="panel p-4 bg-[var(--bg-subtle)] mb-4">
                <div className="text-[10px] text-[var(--text-muted)] mb-2">COMPLETION REPORT</div>
                <p className="text-sm whitespace-pre-wrap">
                  {selected.report || 'No report submitted.'}
                </p>
                {selected.submittedAt && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-3">
                    Submitted: {new Date(selected.submittedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Review Notes */}
              <div>
                <div className="text-[10px] text-[var(--text-muted)] mb-2">REVIEW NOTES (required if rejecting)</div>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => { setReviewNotes(e.target.value); setShowRejectError(false); }}
                  placeholder="Add feedback or rejection reason..."
                  className="w-full h-24 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-sm resize-none"
                />
                {showRejectError && (
                  <div className="text-xs text-red-400 mt-1">
                    Please provide feedback or rejection reason.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleReject}
                  disabled={reviewing || !reviewNotes.trim()}
                  className="btn btn-sm bg-red-500 hover:bg-red-600 text-white flex-1 flex items-center justify-center gap-1"
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={reviewing}
                  className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-1"
                >
                  <CheckCircle size={14} /> Approve & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displaySubmissions.map(sub => (
            <button
              key={sub.id}
              onClick={() => selectSubmission(sub)}
              className="w-full panel p-4 text-left hover:shadow-md transition-all border-l-4 border-amber-400"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{sub.questTitle}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {sub.userName || sub.applicantId} • {sub.roleTitle || 'Member'} • Submitted: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}