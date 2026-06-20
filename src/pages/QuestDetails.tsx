import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { applyForQuest, submitQuestCompletion, nowIso, RECEPTIONISTS } from '../lib/repository';
import type { Quest } from '../types/guild';
import { ArrowLeft, Compass, Award, Calendar, Clock, MapPin, Check, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { PAGE_SEO } from '../components/SEO';

export default function QuestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // SEO: Set page title
  useEffect(() => {
    document.title = PAGE_SEO.questDetails.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', PAGE_SEO.questDetails.description);
  }, []);

  // Submission Form States
  const [report, setReport] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  useEffect(() => {
    async function loadQuest() {
      if (!id) return;
      try {
        const docRef = doc(db, 'quests', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setQuest({ id: snap.id, ...snap.data() } as Quest);
        } else {
          setError('Quest details not found in ledger.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch quest record.');
      } finally {
        setLoading(false);
      }
    }
    loadQuest();
  }, [id, success]);

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

  const hasApplied = profile && quest.applicants?.includes(profile.uid);
  const hasBeenAccepted = profile && quest.acceptedMembers?.includes(profile.uid);
  const hasCompleted = profile && (quest.completedMembers?.includes(profile.uid) || quest.status === 'completed');

  const handleApply = async () => {
    if (!profile) {
      navigate('/auth');
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

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setError('');
    try {
      await submitQuestCompletion(quest.id, profile, {
        report,
        links: linkInput ? [linkInput] : [],
        evidenceUrls: evidenceUrl ? [evidenceUrl] : []
      });
      setSuccess('Proof of completion submitted for review.');
      setReport('');
      setLinkInput('');
      setEvidenceUrl('');
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Find coordinator receptionist
  const coordinator = RECEPTIONISTS.find(r => r.uid === quest.assignedReceptionistId) || RECEPTIONISTS[0];

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
            
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
              <span>Posted by: <strong className="text-[var(--text-secondary)] font-bold">{quest.organizationName || 'Guild Hub'}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-[var(--primary)] uppercase tracking-wider">{quest.status}</strong></span>
            </p>
          </div>

          {/* Description */}
          <div className="panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider">Quest Blueprint</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-normal">
              {quest.description}
            </p>
          </div>

          {/* Submission panel for accepted members */}
          {hasBeenAccepted && !hasCompleted && quest.status === 'inProgress' && (
            <div className="panel space-y-4 border border-[var(--primary)]/20 bg-[var(--primary)]/5">
              <div className="flex gap-2 items-center">
                <Sparkles size={16} className="text-[var(--primary)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Submit Proof of Completion</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Provide detailed evidence and links of your deliverables. Your assigned coordinator will review and verify this to issue reputation points and certification logs.
              </p>

              <form onSubmit={handleSubmission} className="space-y-4">
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
          {/* Actions card */}
          <div className="panel space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Quest Reward Index</span>
              <strong className="text-3xl font-extrabold text-[var(--primary)] block">+{quest.reputationPoints} Rep</strong>
              {quest.isPaid && quest.paymentAmount && (
                <span className="text-sm font-bold text-emerald-400 block mt-1">
                  Payout: ₹{quest.paymentAmount} ({quest.paymentType || 'Bank Transfer'})
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

            {/* Application action trigger */}
            {!hasBeenAccepted && !hasCompleted && quest.status === 'open' && (
              <button
                onClick={handleApply}
                disabled={submitting || hasApplied || false}
                className={`w-full py-3 rounded-xl font-bold text-xs cursor-pointer ${hasApplied ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'primary'}`}
              >
                {hasApplied ? 'Application Pending Review' : 'Apply For Quest'}
              </button>
            )}

            {hasBeenAccepted && (
              <div className="p-3 text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-xl">
                Quest Assigned to You
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
    </div>
  );
}
