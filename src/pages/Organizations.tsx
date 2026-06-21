import React, { useState, useEffect, useMemo } from 'react';
import { fetchOrganizations, RECEPTIONISTS } from '../lib/repository';
import type { Organization } from '../types/guild';
import { Link, useParams } from 'react-router-dom';
import { Building, ShieldCheck, Mail, ArrowRight, Plus, Search, Filter, MapPin, Globe, Users, TrendingUp, Calendar, ExternalLink, ChevronRight, Star, Briefcase, Target, Award, X } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import SEO, { PAGE_SEO } from '../components/SEO';

// Filter options
const CATEGORIES = ['Business', 'NGO', 'College', 'Contractor', 'Community Group', 'Government Related'];
const STATUSES = ['new', 'contacted', 'active', 'partner', 'inactive'];
const TRUST_LEVELS = ['new', 'verified', 'trusted', 'partner'];

export default function Organizations() {
  const { id } = useParams();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchOrganizations();
        setOrgs(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter organizations for public display (only show public ones)
  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const visibleOrgs = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orgs.filter(org => {
      // Skip draft or hidden orgs from public listing
      if (org.archiveStatus === 'archived') return false;
      // Enhanced search filter - check more fields
      if (s) {
        const haystack = `${org.name || ''} ${org.city || ''} ${org.description || ''} ${org.category || ''} ${org.industry || ''}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      // Filter by category
      if (categoryFilter && org.category !== categoryFilter) return false;
      // Filter by status (only show active/partner/verified)
      if (statusFilter && org.currentStatus !== statusFilter) return false;
      return true;
    });
  }, [orgs, search, categoryFilter, statusFilter]);

  // Sort by trust level and active status
  const sortedOrgs = useMemo(() => {
    return [...visibleOrgs].sort((a, b) => {
      // Verified/partner first
      if (a.trustLevel === 'partner' && b.trustLevel !== 'partner') return -1;
      if (b.trustLevel === 'partner' && a.trustLevel !== 'partner') return 1;
      if (a.trustLevel === 'trusted' && b.trustLevel === 'new') return -1;
      if (b.trustLevel === 'trusted' && a.trustLevel === 'new') return 1;
      // Active status first
      if (a.currentStatus === 'active' && b.currentStatus !== 'active') return -1;
      if (b.currentStatus === 'active' && a.currentStatus !== 'active') return 1;
      return 0;
    });
  }, [visibleOrgs]);

  // Pagination
  const totalPages = Math.ceil(sortedOrgs.length / ITEMS_PER_PAGE);
  const paginatedOrgs = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sortedOrgs.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedOrgs, page]);

  // If viewing a specific organization
  if (id) {
    const org = orgs.find(o => o.id === id);
    if (org) {
      return <OrganizationProfile org={org} />;
    }
  }

  return (
    <React.Fragment>
    <SEO {...PAGE_SEO.organizations} />
    <div className="space-y-8 py-4 text-left max-w-6xl mx-auto animate-fade-up">
      {/* Hero banner */}
      <div className="hero-panel bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)] p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div>
          <span className="eyebrow block">Guild Ecosystem</span>
          <h1 className="text-3xl font-black tracking-tight mt-0.5">Organizations Directory</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-lg leading-relaxed font-normal">
            Discover verified organizations powering community outcomes. NGOs, businesses, and institutions driving impact through Guild partnerships.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 whitespace-nowrap">
          <Link to="/org-landing" className="secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <Globe size={14} /> Learn About Guild
          </Link>
          <Link to="/org-register" className="primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1">
            <Plus size={14} /> Partner With Us
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            className="pl-10 w-full"
            placeholder="Search organizations by name, city, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`secondary !py-2 !px-3 text-xs flex items-center gap-1.5 ${showFilters ? '!bg-[var(--primary)] !text-black' : ''}`}
          >
            <Filter size={14} /> Filters
            {(categoryFilter || statusFilter) && (
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            )}
          </button>

          <span className="text-xs text-[var(--text-muted)] ml-2">
            {sortedOrgs.length} organization{sortedOrgs.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="panel p-4 rounded-xl bg-[var(--card-subtle)]/30 border border-[var(--border)] animate-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-sm min-w-[160px]"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-sm min-w-[160px]"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status} className="capitalize">{status}</option>
                ))}
              </select>
            </div>

            {(categoryFilter || statusFilter) && (
              <button
                onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}
                className="text-xs text-[var(--primary)] hover:underline self-end pb-1"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Directory listing */}
      <section className="space-y-4">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[var(--muted)] border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[var(--text-muted)]">Retrieving organizations directory...</p>
          </div>
        ) : sortedOrgs.length > 0 ? (
          <React.Fragment>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedOrgs.map(o => (
                <OrganizationCard key={o.id} org={o} />
              ))}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="secondary !py-2 !px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-[var(--text-muted)] px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="secondary !py-2 !px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </React.Fragment>
        ) : (
          <EmptyState
            title="No Organizations Found"
            description={search || categoryFilter || statusFilter
              ? "No organizations match your current filters. Try broadening your search."
              : "Be the first organization to join Guild's ecosystem."
            }
            whyItMatters="Organizations are the entities that source and fund quest campaigns. Without registered groups, members have no external tasks to claim."
            actionText={!search && !categoryFilter && !statusFilter ? "Register Your Organization" : undefined}
            onAction={!search && !categoryFilter && !statusFilter ? () => window.location.href = '/org-onboarding' : undefined}
            icon={<Building size={22} />}
          />
        )}
      </section>

      {/* CTA Banner */}
      {!loading && sortedOrgs.length > 0 && (
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 border border-[var(--primary)]/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold">Ready to join the ecosystem?</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Register your organization to access Guild services, post needs, and connect with vetted talent.
              </p>
            </div>
            <Link to="/org-register" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap">
              <Plus size={16} /> Partner With Us
            </Link>
          </div>
        </div>
      )}
    </div>
    </React.Fragment>
  );
}

// Organization Card Component
function OrganizationCard({ org }: { org: Organization }) {
  return (
    <div className="panel p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col justify-between space-y-4 hover:border-[var(--primary)]/30 transition-all group">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-2">
          <span className="text-[9px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
            {org.category}
          </span>
          <span className={`text-[9px] uppercase font-black tracking-wider flex items-center gap-0.5 ${org.trustLevel === 'verified' || org.trustLevel === 'partner' ? 'text-emerald-400' : 'text-amber-400'}`}>
            <ShieldCheck size={10} /> {org.trustLevel}
          </span>
        </div>

        <div>
          <strong className="text-base font-extrabold text-[var(--text)] block group-hover:text-[var(--primary)] transition-colors">{org.name}</strong>
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 mt-1 font-semibold">
            <MapPin size={10} /> {org.city || 'Global Hub'}
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{org.description}</p>
      </div>

      <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center text-xs">
        <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1 truncate max-w-[150px]">
          <Mail size={11} /> {org.email || 'Contact on file'}
        </span>

        <Link to={`/org/${org.id}`} className="text-[var(--primary)] font-bold hover:underline flex items-center gap-0.5 whitespace-nowrap">
          View Profile <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// Organization Profile Page
function OrganizationProfile({ org }: { org: Organization }) {
  // Determine trust badge color
  const trustColor = org.trustLevel === 'partner' ? 'text-purple-400' : org.trustLevel === 'trusted' ? 'text-emerald-400' : 'text-amber-400';
  const trustBg = org.trustLevel === 'partner' ? 'bg-purple-500/10 border-purple-500/20' : org.trustLevel === 'trusted' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20';

  return (
    <div className="space-y-8 py-4 animate-fade-up max-w-4xl mx-auto">
      {/* Back link */}
      <Link to="/organizations" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
        <ChevronRight className="w-3 h-3 rotate-180" /> Back to Directory
      </Link>

      {/* Profile Header */}
      <div className="panel p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)]">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
                {org.category}
              </span>
              <span className={`text-[10px] uppercase font-black tracking-wider flex items-center gap-1 ${trustColor}`}>
                <ShieldCheck size={12} /> {org.trustLevel}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${org.currentStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                {org.currentStatus}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{org.name}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
              {org.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {org.city}
                </span>
              )}
              {org.industry && (
                <span className="flex items-center gap-1.5">
                  <Briefcase size={14} /> {org.industry}
                </span>
              )}
              {org.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={14} /> {org.email}
                </span>
              )}
            </div>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Needs</p>
              <p className="text-xl font-bold">{org.needsProcessed || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Quests</p>
              <p className="text-xl font-bold">{org.questsCreated || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Outcomes</p>
              <p className="text-xl font-bold">{org.outcomesDelivered || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      {org.description && (
        <div className="panel p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building size={18} /> About
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{org.description}</p>
        </div>
      )}

      {/* Guild Connection Section */}
      <div className="panel p-6 rounded-xl">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ShieldCheck size={18} /> Guild Partnership
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Trust Level</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${trustBg}`}>
              <ShieldCheck size={14} />
              {org.trustLevel === 'partner' ? 'Trusted Partner' : org.trustLevel === 'trusted' ? 'Verified Trusted' : org.trustLevel === 'verified' ? 'Verified' : 'New Partnership'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Verification Status</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${org.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              {org.verificationStatus === 'verified' ? 'Verified' : org.verificationStatus === 'pending' ? 'Under Review' : 'Not Verified'}
            </div>
          </div>
          {org.assignedReceptionistId && (() => {
            const receptionist = RECEPTIONISTS.find(r => r.uid === org.assignedReceptionistId);
            return (
              <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] md:col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Dedicated Guild Representative</p>
                {receptionist ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-[var(--border)]">
                      <img src={receptionist.photoURL} alt={receptionist.fullName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{receptionist.fullName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{receptionist.role}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium">Account Manager Assigned</p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-2">This organization has a dedicated Guild representative for partnership support.</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Contact CTA */}
      <div className="panel p-6 rounded-xl bg-gradient-to-r from-[var(--primary)]/10 to-transparent border-[var(--primary)]/20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-bold">Interested in partnering?</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Learn how Guild can support your organization's needs.
            </p>
          </div>
          <Link to="/org-landing" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap">
            <Globe size={16} /> Learn More
          </Link>
        </div>
      </div>
    </div>
  );
}