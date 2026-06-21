import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchQuestSubmissions, approveSubmission, rejectSubmission } from '../lib/repository';
import type { QuestSubmission } from '../types/guild';
import { useNavigate } from 'react-router-dom';
import { FileCheck, FileX, Clock, CheckCircle, XCircle, Loader, ExternalLink, User, Calendar } from 'lucide-react';
import EmptyState from '../components/EmptyState';

// Status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'approved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

export default function SubmissionReviewQueue() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<{submission: QuestSubmission; action: 'approve' | 'reject'} | null>(null);
  const [notes, setNotes] = useState('');

  // Only receptionists and admins can review
  const canReview = profile && ['receptionist', 'cityGuildMaster', 'founder'].includes(profile.role);

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const list = await fetchQuestSubmissions();
        setSubmissions(list);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'pending') return s.status === 'pending';
    if (filter === 'approved') return s.status === 'approved';
    if (filter === 'rejected') return s.status === 'rejected';
    return true;
  });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  const handleReview = async () => {
    if (!showModal) return;
    setProcessing(showModal.submission.id);
    try {
      if (showModal.action === 'approve') {
        await approveSubmission(showModal.submission.id, profile!, notes);
        setSubmissions(prev =>
          prev.map(s => s.id === showModal.submission.id ? { ...s, status: 'approved', reviewerNotes: notes } : s)
        );
      } else {
        await rejectSubmission(showModal.submission.id, profile!, notes);
        setSubmissions(prev =>
          prev.map(s => s.id === showModal.submission.id ? { ...s, status: 'rejected', reviewerNotes: notes } : s)
        );
      }
      setShowModal(null);
      setNotes('');
    } catch (err) {
      console.error('Failed to review submission:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Show access denied for non-receptionists
  if (!canReview && !loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <EmptyState
          title="Access Restricted"
          description="Only Guild Representatives (Receptionists) can review quest submissions."
          whyItMatters="Submission reviews require verification authority to ensure quest quality and member accountability."
          actionText="Go to Quest Board"
          onAction={() => navigate('/quests')}
          icon={<FileCheck size={22} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <FileCheck size={24} className="text-[var(--primary)]" />
            Submission Review Queue
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review and verify member quest completion proofs
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="text-center px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-lg font-black text-amber-400">{pendingCount}</div>
            <div className="text-[9px] text-amber-400/70 uppercase font-bold">Pending</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-black text-emerald-400">{approvedCount}</div>
            <div className="text-[9px] text-emerald-400/70 uppercase font-bold">Approved</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-lg font-black text-red-400">{rejectedCount}</div>
            <div className="text-[9px] text-red-400/70 uppercase font-bold">Rejected</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {f === 'pending' ? `Pending (${pendingCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)]">
          <Loader className="animate-spin inline mr-2" />Loading submissions...
        </div>
      ) : filteredSubmissions.length > 0 ? (
        <div className="grid gap-4">
          {filteredSubmissions.map(submission => (
            <div key={submission.id} className="panel p-5 rounded-xl border border-[var(--border)]">
              {/* Header */}
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">{submission.questTitle}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <User size={12} /> {submission.memberName || submission.memberId}
                    </span>
                    {submission.questType === 'openSource' && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px]">Open Source</span>
                    )}
                    {submission.roleTitle && (
                      <span className="text-purple-400">{submission.roleTitle}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(submission.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(submission.status)}`}>
                  {submission.status}
                </span>
              </div>

              {/* Summary - Quick overview */}
              {submission.summary && (
                <div className="mb-4 p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                  <h4 className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider mb-1">Executive Summary</h4>
                  <p className="text-sm text-[var(--text-secondary)]">{submission.summary}</p>
                </div>
              )}

              {/* Main Report */}
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Submission Report</h4>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{submission.report}</p>
              </div>

              {/* Achievements */}
              {submission.achievements && submission.achievements.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">Key Achievements</h4>
                  <ul className="space-y-1">
                    {submission.achievements.map((achievement, idx) => (
                      <li key={idx} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="text-amber-400 mt-1">★</span>
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Outcomes Produced */}
              {submission.outcomesProduced && submission.outcomesProduced.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Outcomes Produced</h4>
                  <ul className="space-y-1">
                    {submission.outcomesProduced.map((outcome, idx) => (
                      <li key={idx} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">✓</span>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence Links */}
              {submission.evidenceUrls && submission.evidenceUrls.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Evidence Links</h4>
                  <div className="flex flex-wrap gap-2">
                    {submission.evidenceUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--primary)] flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink size={10} /> Evidence {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewer Notes */}
              {submission.reviewerNotes && (
                <div className="mb-4 p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Reviewer Notes</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{submission.reviewerNotes}</p>
                </div>
              )}

              {/* Actions for Pending */}
              {submission.status === 'pending' && canReview && (
                <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => setShowModal({ submission, action: 'approve' })}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setShowModal({ submission, action: 'reject' })}
                    className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={filter === 'pending' ? "No Pending Reviews" : `No ${filter} Submissions`}
          description={filter === 'pending' ? "All quest submissions have been reviewed." : `There are no ${filter} submissions to display.`}
          whyItMatters="Reviews ensure quest quality and maintain accountability standards."
          actionText="Go to Quest Board"
          onAction={() => navigate('/quests')}
          icon={<FileCheck size={22} />}
        />
      )}

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              {showModal.action === 'approve' ? (
                <><CheckCircle size={20} className="text-emerald-400" /> Approve Submission</>
              ) : (
                <><XCircle size={20} className="text-red-400" /> Reject Submission</>
              )}
            </h2>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Reviewer Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={showModal.action === 'approve' ? 'Great work! Quest completed successfully.' : 'Please address the following issues...'}
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
                disabled={processing === showModal.submission.id}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                  showModal.action === 'approve'
                    ? 'bg-emerald-500 text-black'
                    : 'bg-red-500 text-white'
                }`}
              >
                {processing === showModal.submission.id ? (
                  <><Loader className="animate-spin" size={14} /> Processing...</>
                ) : showModal.action === 'approve' ? (
                  <><CheckCircle size={14} /> Confirm Approve</>
                ) : (
                  <><XCircle size={14} /> Confirm Reject</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}