import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { RECEPTIONISTS, fetchReceptionistById } from '../lib/repository';
import GuildContactCard from '../components/GuildContactCard';
import type { Need, Quest, Opportunity, Receptionist } from '../types/guild';
import { ArrowLeft, Clock, FileText, ChevronRight, CheckCircle, AlertCircle, Loader, ArrowDown, Briefcase, Target, Award, Circle } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  submitted: { label: 'Submitted', desc: 'Your need has been received', color: 'text-slate-400' },
  underReview: { label: 'Under Review', desc: 'Guild Representative is reviewing', color: 'text-amber-400' },
  accepted: { label: 'Accepted', desc: 'Your need has been accepted', color: 'text-emerald-400' },
  convertedToOpportunity: { label: 'Opportunity Created', desc: 'Converted to an opportunity', color: 'text-blue-400' },
  questCreationInProgress: { label: 'Quest Creation', desc: 'Quest is being created', color: 'text-purple-400' },
  inProgress: { label: 'In Progress', desc: 'Work is underway', color: 'text-cyan-400' },
  completed: { label: 'Completed', desc: 'Delivered successfully', color: 'text-emerald-500' },
  closed: { label: 'Closed', desc: 'This need is closed', color: 'text-slate-500' }
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function NeedDetails() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [need, setNeed] = useState<Need | null>(null);
  const [linkedQuest, setLinkedQuest] = useState<Quest | null>(null);
  const [linkedOpportunity, setLinkedOpportunity] = useState<Opportunity | null>(null);
  const [receptionist, setReceptionist] = useState<Receptionist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNeed() {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'needs', id));
        if (snap.exists()) {
          const needData = { id: snap.id, ...snap.data() } as Need;
          setNeed(needData);

          // Load linked quest if questId exists
          if (needData.questId) {
            const questSnap = await getDoc(doc(db, 'quests', needData.questId));
            if (questSnap.exists()) {
              setLinkedQuest({ id: questSnap.id, ...questSnap.data() } as Quest);
            }
          }

          // Load linked opportunity if opportunityId exists
          if (needData.opportunityId) {
            const oppSnap = await getDoc(doc(db, 'opportunities', needData.opportunityId));
            if (oppSnap.exists()) {
              setLinkedOpportunity({ id: oppSnap.id, ...oppSnap.data() } as Opportunity);
            }
          }

          // Load assigned receptionist from the user store if possible
          let receptionistRecord: Receptionist | null = null;
          if (needData.assignedReceptionistId) {
            receptionistRecord = await fetchReceptionistById(needData.assignedReceptionistId);
          }
          setReceptionist(
            receptionistRecord ||
            RECEPTIONISTS.find(r => r.uid === needData.assignedReceptionistId) ||
            {
              uid: needData.assignedReceptionistId || 'unknown',
              fullName: needData.assignedReceptionistName || 'Guild Representative',
              role: 'Guild Representative',
              email: '',
              phone: '',
              photoURL: ''
            }
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNeed();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)]"><Loader className="animate-spin inline mr-2" />Loading need details...</div>;
  }

  if (!need) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold">Need Not Found</h2>
        <p className="text-sm text-[var(--text-muted)] mt-2">This need doesn't exist or has been removed.</p>
        <Link to="/org-dashboard" className="primary inline-flex items-center gap-1 mt-4 px-4 py-2">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const status = STATUS_LABELS[need.status] || STATUS_LABELS.submitted;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-left animate-fade-up">
      {/* Header */}
      <Link to="/org-dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] mb-4">
        <ArrowLeft size={12} /> Back to Organization Dashboard
      </Link>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
        {/* Title & Status */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">{need.title}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">submitted on {new Date(need.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border ${PRIORITY_COLORS[need.priority]}`}>
            {need.priority} Priority
          </span>
        </div>

        {/* Status Tracker */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Current Status</h3>
          <div className="flex items-center gap-2 p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
            <CheckCircle size={20} className={status.color} />
            <div>
              <div className={`text-sm font-bold ${status.color}`}>{status.label}</div>
              <div className="text-xs text-[var(--text-muted)]">{status.desc}</div>
            </div>
          </div>
        </div>

        {/* Workflow Chain */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Workflow Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* Step 1: Need */}
            <div className={`p-3 rounded-xl border text-center ${
              need.status !== 'submitted' && need.status !== 'underReview' && need.status !== 'accepted'
                ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--card-subtle)] border-[var(--border)]'
            }`}>
              <Circle size={16} className={`mx-auto mb-1 ${
                need.status !== 'submitted' && need.status !== 'underReview' && need.status !== 'accepted'
                  ? 'text-emerald-400' : 'text-[var(--text-muted)]'
              }`} />
              <div className="text-[10px] font-bold">Need</div>
              <div className="text-[9px] text-[var(--text-muted)]">Submitted</div>
            </div>

            {/* Arrow 1 */}
            <div className="flex items-center justify-center">
              <ArrowDown size={16} className="text-[var(--text-muted)]" />
            </div>

            {/* Step 2: Opportunity */}
            <div className={`p-3 rounded-xl border text-center ${
              (need.status === 'convertedToOpportunity' || need.status === 'questCreationInProgress' || need.status === 'inProgress' || need.status === 'completed')
                ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--card-subtle)] border-[var(--border)]'
            }`}>
              <Briefcase size={16} className={`mx-auto mb-1 ${
                (need.status === 'convertedToOpportunity' || need.status === 'questCreationInProgress' || need.status === 'inProgress' || need.status === 'completed')
                  ? 'text-emerald-400' : 'text-[var(--text-muted)]'
              }`} />
              <div className="text-[10px] font-bold">Opportunity</div>
              <div className="text-[9px] text-[var(--text-muted)]">{need.opportunityId ? 'Created' : 'Pending'}</div>
              {need.opportunityId && (
                <Link to={`/opportunities/${need.opportunityId}`} className="text-[9px] text-[var(--primary)] hover:underline mt-1 block">
                  View →
                </Link>
              )}
            </div>

            {/* Arrow 2 */}
            <div className="flex items-center justify-center">
              <ArrowDown size={16} className="text-[var(--text-muted)]" />
            </div>

            {/* Step 3: Quest */}
            <div className={`p-3 rounded-xl border text-center ${
              (need.status === 'questCreationInProgress' || need.status === 'inProgress' || need.status === 'completed')
                ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--card-subtle)] border-[var(--border)]'
            }`}>
              <Target size={16} className={`mx-auto mb-1 ${
                (need.status === 'questCreationInProgress' || need.status === 'inProgress' || need.status === 'completed')
                  ? 'text-emerald-400' : 'text-[var(--text-muted)]'
              }`} />
              <div className="text-[10px] font-bold">Quest</div>
              <div className="text-[9px] text-[var(--text-muted)]">{need.questId ? 'Posted' : 'Pending'}</div>
              {need.questId && (
                <Link to={`/quests/${need.questId}`} className="text-[9px] text-[var(--primary)] hover:underline mt-1 block">
                  View →
                </Link>
              )}
            </div>

            {/* Arrow 3 */}
            <div className="flex items-center justify-center">
              <ArrowDown size={16} className="text-[var(--text-muted)]" />
            </div>

            {/* Step 4: Outcome */}
            <div className={`p-3 rounded-xl border text-center ${
              need.status === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--card-subtle)] border-[var(--border)]'
            }`}>
              <Award size={16} className={`mx-auto mb-1 ${
                need.status === 'completed'
                  ? 'text-emerald-400' : 'text-[var(--text-muted)]'
              }`} />
              <div className="text-[10px] font-bold">Outcome</div>
              <div className="text-[9px] text-[var(--text-muted)]">{need.status === 'completed' ? 'Delivered' : 'Pending'}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1">
            <FileText size={12} /> Description
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{need.description}</p>
        </div>

        {/* Desired Outcome */}
        {need.desiredOutcome && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Desired Outcome</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{need.desiredOutcome}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Category</div>
            <div className="text-sm font-bold">{need.category}</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Timeline</div>
            <div className="text-sm font-bold">{need.timeline || 'To be discussed'}</div>
          </div>
          {need.organizationId && (
            <Link to={`/org/${need.organizationId}`} className="p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30 hover:bg-[var(--primary)]/20 transition-colors">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Organization</div>
              <div className="text-sm font-bold text-[var(--primary)]">{need.organizationName || 'View Organization'}</div>
            </Link>
          )}
          {need.budgetRange && (
            <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Budget</div>
              <div className="text-sm font-bold">{need.budgetRange}</div>
            </div>
          )}
          {need.deadline && (
            <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Deadline</div>
              <div className="text-sm font-bold">{new Date(need.deadline).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        {/* Next Action */}
        {need.nextAction && (
          <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
            <div className="text-[10px] text-[var(--primary)] uppercase tracking-wider font-bold mb-1">Next Action</div>
            <div className="text-sm text-[var(--text-secondary)]">{need.nextAction}</div>
          </div>
        )}

        {/* Guild Contact Card - replaces simple display */}
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Your Guild Contact</h3>
          <GuildContactCard
            contact={{
              uid: receptionist?.uid ?? need.assignedReceptionistId ?? 'unknown',
              fullName: receptionist?.fullName ?? need.assignedReceptionistName ?? 'Guild Representative',
              photoURL: receptionist?.photoURL,
              phone: receptionist?.phone,
              email: receptionist?.email,
              role: receptionist?.role ?? 'Guild Representative'
            }}
            roleLabel="Guild Representative"
            showContactInfo={true}
            showProfileLink={false}
          />
        </div>
      </div>
    </div>
  );
}