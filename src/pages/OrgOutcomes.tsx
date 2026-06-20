import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOrganizationOutcomes, fetchUserOrganization } from '../lib/repository';
import type { Organization, Outcome } from '../types/guild';
import { Trophy, CheckCircle, Clock, ArrowRight, FileText, Users, Calendar, Award } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function OrgOutcomes() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      try {
        const userOrg = await fetchUserOrganization(profile.uid);
        if (userOrg) {
          setOrg(userOrg);
          const orgOutcomes = await fetchOrganizationOutcomes(userOrg.id);
          setOutcomes(orgOutcomes);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading outcomes...</div>;
  }

  if (!org) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <EmptyState
          title="No Organization Found"
          description="You need to register an organization first."
          whyItMatters="Organizations track their completed work and outcomes."
          actionText="Register Organization"
          onAction={() => window.location.href = '/org-onboarding'}
          icon={<Trophy size={22} />}
        />
      </div>
    );
  }

  const completedOutcomes = outcomes.filter(o => o.status === 'completed' || o.verificationStatus === 'verified');
  const activeOutcomes = outcomes.filter(o => o.status === 'active');

  return (
    <div className="space-y-6 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold">Organization Outcomes</h1>
          <p className="text-sm text-[var(--text-muted)]">Track and showcase your completed collaborations</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-2 text-[var(--primary)] mb-1">
            <Trophy size={14} />
            <span className="text-[10px] font-bold uppercase">Total Outcomes</span>
          </div>
          <div className="text-2xl font-black">{outcomes.length}</div>
        </div>
        <div className="panel p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle size={14} />
            <span className="text-[10px] font-bold uppercase">Completed</span>
          </div>
          <div className="text-2xl font-black">{completedOutcomes.length}</div>
        </div>
        <div className="panel p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Clock size={14} />
            <span className="text-[10px] font-bold uppercase">Active</span>
          </div>
          <div className="text-2xl font-black">{activeOutcomes.length}</div>
        </div>
      </div>

      {/* Outcomes List */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">All Outcomes</h2>

        {outcomes.length > 0 ? (
          <div className="space-y-3">
            {outcomes.map(outcome => (
              <div key={outcome.id} className="panel p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${outcome.verificationStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {outcome.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{outcome.status}</span>
                    </div>
                    <h3 className="text-sm font-bold">{outcome.title}</h3>
                    {outcome.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{outcome.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
                      {outcome.participants && outcome.participants.length > 0 && (
                        <span className="flex items-center gap-1"><Users size={10} /> {outcome.participants.length} participants</span>
                      )}
                      {outcome.revenueGenerated > 0 && (
                        <span className="flex items-center gap-1"><Award size={10} /> ₹{outcome.revenueGenerated.toLocaleString()}</span>
                      )}
                      {outcome.completedAt && (
                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(outcome.completedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Outcomes Yet"
            description="Outcomes will appear here once quests are completed and verified."
            whyItMatters="Outcomes demonstrate real impact and value created through your Guild collaboration."
            actionText="Go to Dashboard"
            onAction={() => window.location.href = '/org-dashboard'}
            icon={<Trophy size={22} />}
          />
        )}
      </section>
    </div>
  );
}