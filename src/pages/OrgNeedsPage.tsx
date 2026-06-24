import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOrganizationNeeds, fetchUserOrganization } from '../lib/repository';
import { Target, Plus, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import type { Need, Organization, OrganizationActivity } from '../types/guild';
import { fetchOrganizationActivities } from '../lib/repository';

export default function OrgNeedsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgNeeds() {
      if (!profile) return;
      try {
        // Get user's organization
        const orgData = await fetchUserOrganization(profile.uid);
        if (!orgData) {
          setLoading(false);
          return;
        }
        setOrg(orgData);
        // Get needs for this organization
        const orgNeeds = await fetchOrganizationNeeds(orgData.id);
        setNeeds(orgNeeds);
      } catch (e) {
        console.error('Failed to load:', e);
      } finally {
        setLoading(false);
      }
    }
    loadOrgNeeds();
  }, [profile?.uid]);

  if (!profile) return null;
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!org) {
    return (
      <div className="panel p-8 text-center">
        <h3>No Organization Found</h3>
        <p className="text-[var(--text-secondary)] mt-2">
          You don't have an organization yet.
        </p>
        <Link to="/org-onboarding" className="primary inline-block mt-4">
          Register Organization
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-amber-400';
      case 'underReview': return 'text-blue-400';
      case 'accepted': return 'text-green-400';
      case 'completed': return 'text-slate-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Organization</p>
          <h1>{org.name}</h1>
          <p className="text-[var(--text-secondary)]">
            Your submitted needs and status
          </p>
        </div>
        <Link to={`/need-submit?id=${org.id}`} className="primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Post New Need
        </Link>
      </div>

      {needs.length === 0 ? (
        <div className="panel p-8 text-center">
          <Target className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
          <h3 className="mt-4">No Needs Submitted</h3>
          <p className="text-[var(--text-secondary)]">
            Submit your first need to get help from the guild.
          </p>
          <Link to={`/need-submit?id=${org.id}`} className="primary inline-block mt-4">
            Post a Need
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {needs.map(need => (
            <Link
              key={need.id}
              to={`/needs/${need.id}`}
              className="panel block hover:bg-[var(--surface-hover)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${getStatusColor(need.status)}`}>
                      {need.status}
                    </span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {need.category}
                    </span>
                  </div>
                  <h3 className="font-semibold">{need.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">
                    {need.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              {need.nextAction && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-secondary)]">{need.nextAction}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}