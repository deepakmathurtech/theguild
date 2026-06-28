import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchOrganizations, fetchUsers, fetchBranches, updateOrganizationStatus, assignReceptionistToOrg } from '../lib/repository';
import type { Organization, GuildUser } from '../types/guild';
import type { BranchProfileData } from '../lib/repository';
import {
  Building, Search, Filter, MapPin, Phone, Mail, Shield, CheckCircle, XCircle,
  Clock, Star, Award, User, ArrowRight, Loader, Edit, Users, BarChart3,
  BriefcaseBusiness, HeartHandshake, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

const CATEGORIES = ['', 'Business', 'NGO', 'College', 'Contractor', 'Community Group', 'Government Related'];
const STATUSES = ['', 'new', 'contacted', 'active', 'partner', 'inactive', 'verified', 'trusted', 'partner'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contacted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  partner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  verified: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  trusted: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

const TRUST_BADGES: Record<string, string> = {
  verified: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
  trusted: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
  partner: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
};

export default function OrganizationManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [receptionists, setReceptionists] = useState<GuildUser[]>([]);
  const [branches, setBranches] = useState<BranchProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState<'receptionist' | 'branch'>('receptionist');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Check permissions - receptionist and above
  const canManage = profile && ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder'].includes(profile.role);

  useEffect(() => {
    async function loadData() {
      try {
        const [orgs, users, branchData] = await Promise.all([
          fetchOrganizations(100),
          fetchUsers({ role: 'receptionist' }, 50),
          fetchBranches()
        ]);
        setOrganizations(orgs);
        setReceptionists(users.filter(u => u.role === 'receptionist'));
        setBranches(branchData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => {
      if (categoryFilter && org.category !== categoryFilter) return false;
      if (statusFilter && org.currentStatus !== statusFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          org.name.toLowerCase().includes(searchLower) ||
          org.city?.toLowerCase().includes(searchLower) ||
          org.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [organizations, search, categoryFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: organizations.length,
    new: organizations.filter(o => o.currentStatus === 'new').length,
    active: organizations.filter(o => o.currentStatus === 'active').length,
    partner: organizations.filter(o => o.currentStatus === 'partner').length,
    verified: (organizations.filter(o => o.currentStatus === 'verified') || organizations.filter(o => o.trustLevel === 'verified')).length,
    trusted: (organizations.filter(o => o.currentStatus === 'trusted') || organizations.filter(o => o.trustLevel === 'trusted')).length,
  }), [organizations]);

  const handleStatusChange = async (org: Organization, newStatus: 'new' | 'contacted' | 'active' | 'partner' | 'inactive' | 'verified' | 'trusted') => {
    if (!profile) return;
    setProcessing(org.id);
    try {
      await updateOrganizationStatus(org.id, newStatus, profile);
      setOrganizations(prev => prev.map(o => o.id === org.id ? { ...o, currentStatus: newStatus } as Organization : o));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleAssign = async () => {
    if (!selectedOrg || !selectedAssignee || !profile) return;
    setProcessing(selectedOrg.id);
    try {
      if (assignType === 'receptionist') {
        await assignReceptionistToOrg(selectedOrg.id, selectedAssignee, profile);
      }
      // For branch assignment, we would need a separate function - update for now just log
      setOrganizations(prev => prev.map(o =>
        o.id === selectedOrg.id
          ? { ...o, [assignType === 'receptionist' ? 'assignedReceptionistId' : 'branchId']: selectedAssignee }
          : o
      ));
      setShowAssignModal(false);
      setSelectedAssignee('');
    } catch (err) {
      console.error('Failed to assign:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Access denied
  if (!canManage && !loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <EmptyState
          title="Access Restricted"
          description="Only Guild Representatives (Receptionists) and above can manage organizations."
          whyItMatters="Organization management requires verification authority."
          actionText="Go to Dashboard"
          onAction={() => navigate('/')}
          icon={<Shield size={22} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Building size={26} className="text-[var(--primary)]" />
            Organization Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track, verify, and manage organization relationships across jurisdictions
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-2 flex-wrap">
          <div className="text-center px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-lg font-black text-blue-400">{stats.new}</div>
            <div className="text-[9px] text-blue-400/70 uppercase font-bold">New</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-black text-emerald-400">{stats.active}</div>
            <div className="text-[9px] text-emerald-400/70 uppercase font-bold">Active</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="text-lg font-black text-cyan-400">{stats.verified}</div>
            <div className="text-[9px] text-cyan-400/70 uppercase font-bold">Verified</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <div className="text-lg font-black text-violet-400">{stats.trusted}</div>
            <div className="text-[9px] text-violet-400/70 uppercase font-bold">Trusted</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-lg font-black text-amber-400">{stats.partner}</div>
            <div className="text-[9px] text-amber-400/70 uppercase font-bold">Partners</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search organizations..."
              className="pl-9 pr-4 py-2 w-full text-xs bg-[var(--input-bg)] border border-[var(--border)] rounded-xl"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border)] rounded-xl cursor-pointer appearance-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.filter(c => c).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[var(--input-bg)] border border-[var(--border)] rounded-xl cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUSES.filter(s => s).map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Organization List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)]">
          <Loader className="animate-spin inline mr-2" />Loading organizations...
        </div>
      ) : filteredOrgs.length > 0 ? (
        <div className="space-y-3">
          {filteredOrgs.map(org => (
            <div
              key={org.id}
              className={`panel p-4 rounded-xl border border-[var(--border)] hover:shadow-md transition-shadow ${
                selectedOrg?.id === org.id ? 'ring-2 ring-[var(--primary)]' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[var(--card-subtle)] flex items-center justify-center flex-shrink-0">
                    <BriefcaseBusiness size={20} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold truncate">{org.name}</h3>
                      {org.currentStatus === 'verified' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                          <Shield size={10} className="inline mr-1" />Verified
                        </span>
                      )}
                      {org.currentStatus === 'trusted' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-violet-500/10 text-violet-400 border-violet-500/30">
                          <HeartHandshake size={10} className="inline mr-1" />Trusted
                        </span>
                      )}
                      {org.currentStatus === 'partner' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">
                          <Star size={10} className="inline mr-1" />Partner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{org.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <BriefcaseBusiness size={10} />{org.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />{org.city}
                      </span>
                      {org.contactPerson && (
                        <span className="flex items-center gap-1">
                          <User size={10} />{org.contactPerson}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${STATUS_COLORS[org.currentStatus] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                    {org.currentStatus}
                  </span>

                  {/* Status Actions */}
                  <div className="flex gap-1 mt-2">
                    {org.currentStatus === 'new' && (
                      <button
                        onClick={() => handleStatusChange(org, 'contacted')}
                        disabled={processing === org.id}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                      >
                        {processing === org.id ? <Loader className="animate-spin w-3 h-3" /> : 'Mark Contacted'}
                      </button>
                    )}
                    {org.currentStatus === 'contacted' && (
                      <button
                        onClick={() => handleStatusChange(org, 'active')}
                        disabled={processing === org.id}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                      >
                        {processing === org.id ? <Loader className="animate-spin w-3 h-3" /> : 'Mark Active'}
                      </button>
                    )}
                    {org.currentStatus === 'active' && (
                      <>
                        <button
                          onClick={() => { setSelectedOrg(org); setAssignType('receptionist'); setShowAssignModal(true); }}
                          disabled={processing === org.id}
                          className="px-2 py-1 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                        >
                          Assign Rep
                        </button>
                        <button
                          onClick={() => handleStatusChange(org, 'verified')}
                          disabled={processing === org.id}
                          className="px-2 py-1 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                        >
                          {processing === org.id ? <Loader className="animate-spin w-3 h-3" /> : 'Verify'}
                        </button>
                      </>
                    )}
                    {org.currentStatus === 'verified' && (
                      <button
                        onClick={() => handleStatusChange(org, 'trusted')}
                        disabled={processing === org.id}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/30 hover:bg-violet-500/20 transition-colors"
                      >
                        {processing === org.id ? <Loader className="animate-spin w-3 h-3" /> : 'Promote to Trusted'}
                      </button>
                    )}
                    {org.currentStatus === 'trusted' && (
                      <button
                        onClick={() => handleStatusChange(org, 'partner')}
                        disabled={processing === org.id}
                        className="px-2 py-1 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                      >
                        {processing === org.id ? <Loader className="animate-spin w-3 h-3" /> : 'Make Partner'}
                      </button>
                    )}
                  </div>

                  {/* View Details */}
                  <button
                    onClick={() => navigate(`/org/${org.id}`)}
                    className="text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    View Profile <ExternalLink size={10} />
                  </button>
                </div>
              </div>

              {/* Relationship Info */}
              {(org.assignedReceptionistId || org.branchId) && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-4 text-[10px]">
                  {org.assignedReceptionistId && (
                    <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <User size={10} /> Assigned Receptionist
                    </span>
                  )}
                  {org.branchId && (
                    <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <BarChart3 size={10} /> Branch: {branches.find(b => b.id === org.branchId)?.name || org.branchId}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Organizations Found"
          description={search || categoryFilter || statusFilter ? "No organizations match your filters." : "No organizations have been registered yet."}
          whyItMatters="Start by registering organizations in your jurisdiction."
          actionText="Go to Organizations"
          onAction={() => navigate('/organizations')}
          icon={<Building size={22} />}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-up">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <User size={20} className="text-[var(--primary)]" />
              Assign {assignType === 'receptionist' ? 'Receptionist' : 'Branch'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              {selectedOrg.name}
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {assignType === 'receptionist' ? (
                receptionists.length > 0 ? (
                  receptionists.map(rec => (
                    <button
                      key={rec.uid}
                      onClick={() => setSelectedAssignee(rec.uid)}
                      className={`w-full p-3 rounded-xl border text-left transition-colors ${
                        selectedAssignee === rec.uid
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                          : 'border-[var(--border)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-sm font-bold">{rec.fullName}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{rec.jurisdiction?.cityName}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">No receptionists available</p>
                )
              ) : (
                branches.length > 0 ? (
                  branches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => setSelectedAssignee(branch.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-colors ${
                        selectedAssignee === branch.id
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                          : 'border-[var(--border)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-sm font-bold">{branch.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{branch.city}, {branch.state}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">No branches available</p>
                )
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowAssignModal(false); setSelectedAssignee(''); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--card-subtle)] border border-[var(--border)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAssignee || processing === selectedOrg.id}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing === selectedOrg.id ? <Loader className="animate-spin w-4 h-4" /> : <>Assign <CheckCircle size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}