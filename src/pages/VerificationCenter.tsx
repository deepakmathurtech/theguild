import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateLedgerRecord } from '../lib/repository';
import { ShieldCheck, Award, FileText, Send, Calendar, AlertTriangle, Check } from 'lucide-react';

export default function VerificationCenter() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [method, setMethod] = useState('reportReview');
  const [evidence, setEvidence] = useState('');
  const [notes, setNotes] = useState('');

  if (!profile) return null;

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateLedgerRecord(
        'users',
        profile.uid,
        {
          verificationStatus: 'pending',
          activityHistory: [...(profile.activityHistory || []), 'Submitted verification request for identity audit.']
        },
        profile,
        'Submit Verification Claim'
      );
      setSuccess('Verification request recorded. A branch receptionist will review your submission.');
    } catch (err: any) {
      setError(err.message || 'Failed to file verification claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-4 text-left max-w-3xl mx-auto animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Trust & Verification Center</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Review your credentials verification level, submit rank promotions, and claim certified identity indicators.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6">
        {/* Verification Status Banner */}
        <div className="panel flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${profile.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block">Profile Status</span>
              <strong className="text-lg font-bold text-[var(--text)] block mt-0.5">
                {profile.verificationStatus === 'verified' ? 'Fully Audited & Verified' : 'Pending Receptionist Review'}
              </strong>
              <span className="text-xs text-[var(--text-secondary)] font-medium block mt-1">
                Branch: {profile.jurisdiction?.guildBranchName || 'Unassigned Node'}
              </span>
            </div>
          </div>

          <div className="text-xs">
            <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] block mb-1">Reputation Rank</span>
            <span className="font-extrabold text-[var(--primary)] flex items-center gap-1">
              <Award size={14} /> Rank {profile.guildRank}
            </span>
          </div>
        </div>

        {/* Claim Verification Form */}
        {profile.verificationStatus !== 'verified' && (
          <div className="panel space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={16} className="text-[var(--primary)]" />
              File Verification Request
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Verify your identity, educational background, or contractor records with your assigned relationship manager.
            </p>

            <form onSubmit={handleSubmitClaim} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 required">Verification Method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-2.5 text-xs cursor-pointer"
                >
                  <option value="reportReview">Review of Contribution Report</option>
                  <option value="documentUpload">Government ID / Credentials Audit</option>
                  <option value="organizationConfirmation">Organization Owner Confirmation</option>
                  <option value="manualReview">Manual Receptionist Interview</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 required">Evidence Links / ID References</label>
                <input
                  type="text"
                  required
                  value={evidence}
                  onChange={e => setEvidence(e.target.value)}
                  placeholder="Paste LinkedIn, GitHub, or credential PDF URLs..."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Enter details to assist verification review..."
                  className="text-xs min-h-[80px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="primary w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"
              >
                <Send size={13} />
                <span>{loading ? 'Filing Claim...' : 'Submit Verification Claim'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
