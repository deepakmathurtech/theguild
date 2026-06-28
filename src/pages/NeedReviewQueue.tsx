import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOrganizationNeeds, approveNeed, rejectNeed, fetchOrganizations } from '../lib/repository';
import type { Need, Organization } from '../types/guild';
import {
  FileText, CheckCircle, XCircle, Clock, Loader, AlertTriangle,
  Search, Filter, ChevronRight, ExternalLink, Building, User,
  Calendar, ArrowRight, MessageSquare, TrendingUp
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import GuildStatus, { formatGuildStatus } from '../components/v2/GuildStatus';
import GuildLoading from '../components/v2/GuildLoading';

const NEED_CATEGORIES = ['Technology', 'Research', 'Education', 'Community', 'Marketing', 'Design', 'Operations', 'Other'];

export default function NeedReviewQueue() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [needs, setNeeds] = useState<Need[]>([]);
  const [organizations, setOrganizations] = useState<Map<string, Organization>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState<{need: Need; action: 'approve' | 'reject'} | null>(null);
  const [notes, setNotes] = useState('');

  // Only receptionists and above can review
  const canReview = profile && ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder'].includes(profile.role);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch organizations for lookup
        const orgs = await fetchOrganizations(100);
        const orgMap = new Map<string, Organization>();
        orgs.forEach(org => orgMap.set(org.id, org));
        setOrganizations(orgMap);

        // Fetch all needs and filter - simpler than fetching by org
        // For now, we'll fetch from each organization
        const allNeeds: Need[] = [];
        for (const org of orgs) {
          const orgNeeds = await fetchOrganizationNeeds(org.id);
          allNeeds.push(...orgNeeds.map(n => ({ ...n, _orgName: org.name } as Need & { _orgName?: string })));
        }
        setNeeds(allNeeds);
      } catch (err) {
        console.error('Failed to load needs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter needs
  const filteredNeeds = useMemo(() => {
    return needs.filter(need => {
      if (statusFilter && need.status !== statusFilter) return false;
      if (categoryFilter && need.category !== categoryFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          need.title?.toLowerCase().includes(searchLower) ||
          need.description?.toLowerCase().includes(searchLower) ||
          organizations.get(need.organizationId)?.name.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [needs, statusFilter, categoryFilter, search, organizations]);

  // Stats
  const stats = useMemo(() => ({
    submitted: needs.filter(n => n.status === 'submitted').length,
    underReview: needs.filter(n => n.status === 'underReview').length,
    accepted: needs.filter(n => n.status === 'accepted').length,
    converted: needs.filter(n => n.status === 'convertedToOpportunity').length,
  }), [needs]);

  const handleReview = async () => {
    if (!showModal || !profile) return;
    setProcessing(showModal.need.id);
    try {
      if (showModal.action === 'approve') {
        await approveNeed(showModal.need.id, profile, notes);
        setNeeds(prev => prev.map(n =>
          n.id === showModal.need.id ? { ...n, status: 'accepted', reviewNotes: notes } : n
        ));
      } else {
        await rejectNeed(showModal.need.id, profile, notes);
        setNeeds(prev => prev.map(n =>
          n.id === showModal.need.id ? { ...n, status: 'closed', reviewNotes: notes } : n
        ));
      }
      setShowModal(null);
      setNotes('');
    } catch (err) {
      console.error('Failed to review need:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Access denied
  if (!canReview && !loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <EmptyState
          title="Access Restricted"
          description="Only Guild Representatives (Receptionists) and above can review organization needs."
          whyItMatters="Need reviews require verification authority."
          actionText="Go to Dashboard"
          onAction={() => navigate('/')}
          icon={<FileText size={22} />}
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
            <FileText size={24} className="text-[var(--primary)]" />
            Need Review Queue
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review and process organization needs submitted for quest conversion
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-2 flex-wrap">
          <div className="text-center px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-lg font-black text-blue-400">{stats.submitted}</div>
            <div className="text-[9px] text-blue-400/70 uppercase font-bold">Submitted</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-lg font-black text-amber-400">{stats.underReview}</div>
            <div className="text-[9px] text-amber-400/70 uppercase font-bold">Under Review</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-black text-emerald-400">{stats.accepted}</div>
            <div className="text-[9px] text-emerald-400/70 uppercase font-bold">Accepted</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="text-lg font-black text-purple-400">{stats.converted}</div>
            <div className="text-[9px] text-purple-400/70 uppercase font-bold">Converted</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {['submitted', 'underReview', 'accepted', 'convertedToOpportunity'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === status
                ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {status === 'convertedToOpportunity' ? 'Converted' : formatGuildStatus(status)}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search needs..."
            className="pl-9 pr-4 py-2 w-full text-xs bg-[var(--input-bg)] border border-[var(--border)] rounded-xl"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border)] rounded-xl cursor-pointer"
        >
          <option value="">All Categories</option>
          {NEED_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Needs List */}
      {loading ? (
        <GuildLoading label="Loading needs..." size="lg" />
      ) : filteredNeeds.length > 0 ? (
        <div className="space-y-3">
          {filteredNeeds.map(need => (
            <div key={need.id} className="panel p-4 rounded-xl border border-[var(--border)]">
              {/* Header */}
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{need.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Building size={10} />{organizations.get(need.organizationId)?.name || 'Unknown Organization'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />{need.createdAt ? new Date(need.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                      {need.category && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--card-subtle)] text-[9px] font-medium">
                          {need.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <GuildStatus status={need.status} showDot />
              </div>

              {/* Description */}
              <div className="mb-3">
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{need.description}</p>
              </div>

              {/* Metrics */}
              {(need.budgetRange || need.desiredOutcome) ? (
                <div className="flex gap-4 mb-3 text-[10px]">
                  {need.budgetRange && (
                    <span className="text-[var(--text-muted)]">
                      Budget: <span className="font-bold text-[var(--text)]">{need.budgetRange}</span>
                    </span>
                  )}
                  {need.desiredOutcome && (
                    <span className="text-[var(--text-muted)]">
                      Expected: <span className="font-bold text-[var(--text)]">{need.desiredOutcome}</span>
                    </span>
                  )}
                </div>
              ) : null}

              {/* Reviewer Notes */}
              {need.reviewNotes && (
                <div className="mb-3 p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1">Reviewer Notes</div>
                  <p className="text-xs text-[var(--text-secondary)]">{need.reviewNotes}</p>
                </div>
              )}

              {/* Actions */}
              {need.status === 'submitted' && canReview && (
                <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => setShowModal({ need, action: 'approve' })}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle size={14} /> Accept & Convert
                  </button>
                  <button
                    onClick={() => setShowModal({ need, action: 'reject' })}
                    className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {need.status === 'underReview' && canReview && (
                <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => setShowModal({ need, action: 'approve' })}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setShowModal({ need, action: 'reject' })}
                    className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {/* View Org Link */}
              <button
                onClick={() => navigate(`/org/${need.organizationId}`)}
                className="mt-2 text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                View Organization <ExternalLink size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={statusFilter === 'submitted' ? "No Pending Reviews" : `No ${statusFilter} Needs`}
          description={statusFilter === 'submitted' ? "All needs have been reviewed." : `There are no ${statusFilter} needs to display.`}
          whyItMatters="Reviews ensure need quality and proper categorization."
          actionText="Go to Dashboard"
          onAction={() => navigate('/')}
          icon={<FileText size={22} />}
        />
      )}

      {/* Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-up">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              {showModal.action === 'approve' ? (
                <><CheckCircle size={20} className="text-emerald-400" /> Accept Need</>
              ) : (
                <><XCircle size={20} className="text-red-400" /> Reject Need</>
              )}
            </h2>

            <div className="mb-4 p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <div className="text-sm font-bold">{showModal.need.title}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                {organizations.get(showModal.need.organizationId)?.name}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Reviewer Notes {showModal.action === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={
                  showModal.action === 'approve'
                    ? 'This need is approved for quest conversion...'
                    : 'Please explain why this need is being rejected...'
                }
                className="text-sm min-h-[100px]"
                required={showModal.action === 'reject'}
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
                disabled={processing === showModal.need.id || (showModal.action === 'reject' && !notes.trim())}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                  showModal.action === 'approve'
                    ? 'bg-emerald-500 text-black'
                    : 'bg-red-500 text-white'
                } disabled:opacity-50`}
              >
                {processing === showModal.need.id ? (
                  <><Loader className="animate-spin" size={14} /> Processing...</>
                ) : showModal.action === 'approve' ? (
                  <><CheckCircle size={14} /> Confirm Accept</>
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
