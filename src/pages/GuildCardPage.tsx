import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Award, Check, Copy, Download, Eye, Globe, Lock, QrCode, RefreshCw, Search, Settings, Share2, ShieldCheck, SlidersHorizontal, Sparkles, UserCheck, UserPlus, Users, ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import VerifiedGuildCard from '../components/VerifiedGuildCard';
import { getPublicGuildProfilePath } from '../lib/guildIdentity';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button type="button" onClick={copy} className="btn-secondary-mini flex items-center gap-2">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function StatTile({ icon, label, value, description }: { icon: React.ReactNode; label: string; value: string; description?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 transition-all duration-300 hover:border-[var(--primary)]/30 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xl font-bold text-[var(--text)]">{value}</p>
        <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">{label}</p>
        {description && <p className="mt-1 text-[10px] text-[var(--text-muted)]">{description}</p>}
      </div>
    </div>
  );
}

function VisibilityRow({ enabled, label, description }: { enabled: boolean; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card-subtle)] p-3">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${enabled ? 'bg-emerald-500 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
        {enabled ? <Check size={14} /> : <Lock size={12} />}
      </div>
    </div>
  );
}

export default function GuildCardPage() {
  const { profile } = useAuth();

  if (!profile) return null;

  const passportPath = getPublicGuildProfilePath(profile);
  const passportUrl = typeof window !== 'undefined' ? `${window.location.origin}${passportPath}` : passportPath;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encodeURIComponent(passportUrl)}`;

  // Calculate passport completion
  const passportCompletion = (() => {
    let completed = 0;
    const total = 7;
    if (profile.photoURL) completed++;
    if (profile.publicProfile?.shortBio || profile.bio) completed++;
    if (profile.verificationStatus === 'verified') completed++;
    if ((profile.proofs?.length || 0) > 0) completed++;
    if ((profile.verifiedOutcomes || 0) > 0) completed++;
    if ((profile.completedQuests || 0) > 0) completed++;
    if ((profile.skills?.length || 0) > 0) completed++;
    return Math.round((completed / total) * 100);
  })();

  const trustScore = (() => {
    let score = 20;
    if (profile.verificationStatus === 'verified') score += 25;
    if (profile.photoURL) score += 10;
    if (profile.publicProfile?.shortBio || profile.bio) score += 10;
    if ((profile.verifiedOutcomes || 0) > 0) score += 10;
    if ((profile.skills?.length || 0) >= 3) score += 10;
    if (profile.email) score += 10;
    if (profile.publicProfile?.visibility?.showBio !== false) score += 5;
    return Math.min(score, 100);
  })();

  const verifiedProofs = (profile.proofs || []).filter((p) =>
    p.status === 'verified'
  ).length;

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      {/* Header */}
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)]" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-[var(--primary)]">Guild Card</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl lg:text-4xl">Guild Passport</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
              Your premium digital identity card. Share your verified identity, quest proofs, outcomes, and contribution record with anyone.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/profile" className="btn-secondary-mini">
              <ArrowLeft size={14} />
              Profile
            </Link>
            <Link to="/public-profile-settings" className="btn-secondary-mini">
              <Settings size={14} />
              Settings
            </Link>
            <Link to={passportPath} className="btn-primary-mini" target="_blank">
              <ExternalLink size={14} />
              Open Passport
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<UserCheck size={16} />} label="Status" value={profile.verificationStatus === 'verified' ? 'Verified' : 'Pending'} description="Guild verification" />
        <StatTile icon={<Award size={16} />} label="Rank" value={profile.guildRank || 'Applicant'} description="Current rank" />
        <StatTile icon={<ShieldCheck size={16} />} label="Trust" value={`${trustScore}`} description="out of 100" />
        <StatTile icon={<Sparkles size={16} />} label="Quests" value={String(profile.completedQuests || 0)} description="Completed" />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* Left - Guild Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 lg:p-6">
          <VerifiedGuildCard profile={profile} profileUrl={passportPath} />
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Share Passport */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Share2 size={16} className="text-[var(--primary)]" />
              <h2 className="text-lg font-bold">Share Passport</h2>
            </div>
            <div className="space-y-3">
              <CopyButton label="Copy Passport Link" value={passportUrl} />
              <CopyButton label="Copy Guild ID" value={profile.adventurerId || profile.guildId || profile.uid} />
              <a href={qrUrl} download="guild-passport-qr.png" className="btn-secondary flex items-center justify-center gap-2">
                <Download size={14} />
                Download QR Code
              </a>

            </div>
          </section>

          {/* Visibility Settings */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Eye size={16} className="text-[var(--primary)]" />
              <h2 className="text-lg font-bold">Visibility</h2>
            </div>
            <div className="space-y-2">
              <VisibilityRow
                enabled={true}
                label="Public"
                description="Anyone can view your passport"
              />
              <VisibilityRow
                enabled={profile.verificationStatus === 'verified'}
                label="Verified"
                description="Guild verified badge visible"
              />
              <VisibilityRow
                enabled={true}
                label="Searchable"
                description="Appears in member search"
              />
            </div>
            <Link to="/public-profile-settings" className="btn-ghost mt-4 w-full justify-center">
              <SlidersHorizontal size={14} />
              Manage Visibility
            </Link>
          </section>

          {/* Analytics */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
            <div className="mb-4 flex items-center gap-2">
              <QrCode size={16} className="text-[var(--primary)]" />
              <h2 className="text-lg font-bold">Analytics</h2>
            </div>
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card-subtle)] p-6 text-center">
              <p className="text-xs font-bold text-[var(--text-muted)]">Analytics coming soon</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">Profile views, QR scans, and share tracking will appear here.</p>
            </div>
          </section>

          {/* Passport Completion Tips */}
          <section className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--primary)]">Complete Your Passport</h2>
            </div>
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>Current completion: <span className="font-bold text-[var(--primary)]">{passportCompletion}%</span></p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${profile.photoURL ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  Add profile photo
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${(profile.publicProfile?.shortBio || profile.bio) ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  Add bio
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${profile.verificationStatus === 'verified' ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  Verify with Guild
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${(profile.proofs?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  Submit proofs
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${(profile.skills?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                  Add skills
                </li>
              </ul>
            </div>
            <Link to="/settings" className="btn-primary mt-4 w-full justify-center">
              <UserPlus size={14} />
              Complete Profile
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}