import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building,
  ChevronRight,
  ExternalLink,
  Globe,
  Handshake,
  Mail,
  MapPin,
  ShieldCheck,
  Target,
  Users
} from 'lucide-react';
import { fetchOrganizationById, fetchReceptionistById } from '../lib/repository';
import GuildContactCard from '../components/GuildContactCard';
import EmptyState from '../components/EmptyState';
import type { Organization } from '../types/guild';

function trustLabel(org: Organization) {
  if (org.trustLevel === 'partner') return 'Guild Partner';
  if (org.trustLevel === 'trusted') return 'Trusted Organization';
  if (org.verificationStatus === 'verified' || org.trustLevel === 'verified') return 'Verified Organization';
  return 'Guild Relationship Started';
}

function formatUrl(url?: string) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default function PublicOrganizationProfile() {
  const { id } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [receptionist, setReceptionist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!id) return;
      setLoading(true);
      try {
        const orgData = await fetchOrganizationById(id);
        setOrg(orgData);
        if (orgData?.assignedReceptionistId) {
          const rec = await fetchReceptionistById(orgData.assignedReceptionistId);
          setReceptionist(rec);
        }
      } catch (error) {
        console.error('Failed to load organization profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)]">
        Loading organization profile...
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <EmptyState
          title="Organization Not Found"
          description="This organization profile is unavailable or no longer public."
          whyItMatters="Public organization profiles show verified relationships, trust status, and Guild partnership context."
          actionText="Back to Organizations"
          onAction={() => window.location.href = '/organizations'}
          icon={<Building size={22} />}
        />
      </div>
    );
  }

  const trust = trustLabel(org);
  const metrics = [
    { label: 'Needs Routed', value: org.needsProcessed || 0, icon: Target },
    { label: 'Quests Created', value: org.questsCreated || 0, icon: Award },
    { label: 'Outcomes Delivered', value: org.outcomesDelivered || 0, icon: ShieldCheck }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4 text-left animate-fade-up">
      <Link to="/organizations" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary)]">
        <ChevronRight className="h-3 w-3 rotate-180" /> Organizations
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-emerald-500" />
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
                {org.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                <ShieldCheck size={12} /> {trust}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {org.currentStatus}
              </span>
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">{org.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                {org.description || 'A Guild organization profile for transparent partnerships, routed needs, and verified collaboration outcomes.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-semibold text-[var(--text-muted)]">
              {(org.city || org.state) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} /> {[org.city, org.state].filter(Boolean).join(', ')}
                </span>
              )}
              {org.branchName && (
                <span className="inline-flex items-center gap-1.5">
                  <Building size={14} /> {org.branchName}
                </span>
              )}
              {org.website && (
                <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline">
                  <Globe size={14} /> {formatUrl(org.website)} <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Public Trust Record</p>
            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="flex items-center gap-2 text-[var(--primary)]">
                      <Icon size={14} />
                      <span className="text-[9px] font-black uppercase tracking-wider">{metric.label}</span>
                    </div>
                    <p className="mt-2 text-2xl font-black">{metric.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="panel space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Handshake size={18} className="text-[var(--primary)]" /> Guild Relationship
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Verification" value={org.verificationStatus === 'verified' ? 'Verified' : 'Under Review'} />
            <InfoTile label="Trust Level" value={trust} />
            <InfoTile label="Branch" value={org.branchName || 'Assignment pending'} />
            <InfoTile label="Relationship Status" value={org.currentStatus} />
          </div>
        </section>

        <section className="panel space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Users size={18} className="text-[var(--primary)]" /> Contact
          </h2>
          {receptionist ? (
            <GuildContactCard
              contact={{
                uid: receptionist.uid,
                fullName: receptionist.fullName,
                photoURL: receptionist.photoURL,
                phone: receptionist.phone,
                email: receptionist.email,
                role: receptionist.role
              }}
              roleLabel="Guild Relationship Manager"
            />
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 text-sm text-[var(--text-secondary)]">
              Guild relationship manager assignment is pending.
            </div>
          )}
          {org.email && (
            <a href={`mailto:${org.email}`} className="secondary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold">
              <Mail size={14} /> Contact Organization
            </a>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Bring your organization into Guild</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Create a public trust record, route needs through Guild, and turn completed work into visible outcomes.
            </p>
          </div>
          <Link to="/org-register" className="primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold">
            Partner With Us <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-sm font-bold text-[var(--text)]">{value}</p>
    </div>
  );
}
