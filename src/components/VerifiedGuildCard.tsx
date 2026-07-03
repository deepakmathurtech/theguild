import {
  Award,
  BadgeCheck,
  BadgePercent,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  Download,
  Eye,
  ExternalLink,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  MoreHorizontal,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Link,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { GuildUser, GuildRank } from '../types/guild';

type ProofStatus = 'pending' | 'verified' | 'approved' | 'rejected';

export type VerifiedGuildCardProfile = Partial<GuildUser> & {
  uid?: string;
  id?: string;
  adventurerId?: string;
  guildId?: string;
  fullName?: string;
  photoURL?: string;
  role?: string;
  guildRank?: string;
  verificationStatus?: string;
  branchName?: string;
  city?: string;
  jurisdiction?: {
    cityName?: string;
    stateName?: string;
  };
  bio?: string;
  skills?: string[];
  publicProfile?: {
    headline?: string;
    shortBio?: string;
    visibility?: {
      showBio?: boolean;
      showSocialLinks?: boolean;
    };
  };
  activityHistory?: string[];
};

type VerifiedGuildCardProps = {
  profile: VerifiedGuildCardProfile;
  profileUrl?: string;
  label?: string;
};

// ========== HELPER FUNCTIONS ==========

function formatRole(role?: string) {
  if (!role) return 'Guild Member';
  return role.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
}

function getGuildId(profile: VerifiedGuildCardProfile) {
  return profile.adventurerId || profile.guildId || profile.uid || profile.id || 'Pending';
}

function getLocation(profile: VerifiedGuildCardProfile) {
  return profile.branchName || profile.jurisdiction?.cityName || profile.city || 'Branch pending';
}

function getQrUrl(profileUrl: string, size = 144) {
  const target = typeof window === 'undefined' || profileUrl.startsWith('http')
    ? profileUrl
    : `${window.location.origin}${profileUrl}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(target)}`;
}

function calculatePassportCompletion(profile: VerifiedGuildCardProfile): number {
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
}

function getRankGradient(rank?: string): string {
  const gradients: Record<string, string> = {
    Applicant: 'from-gray-400 to-gray-500',
    F: 'from-red-400 to-red-600',
    E: 'from-orange-400 to-orange-600',
    D: 'from-yellow-400 to-yellow-600',
    C: 'from-green-400 to-green-600',
    B: 'from-blue-400 to-blue-600',
    A: 'from-purple-400 to-purple-600',
    S: 'from-amber-400 via-yellow-400 to-orange-400',
  };
  return rank ? gradients[rank] || gradients.Applicant : gradients.Applicant;
}

function calculateTrustScore(profile: VerifiedGuildCardProfile): number {
  let score = 20; // Base score
  if (profile.verificationStatus === 'verified') score += 25;
  if (profile.photoURL) score += 10;
  if (profile.publicProfile?.shortBio || profile.bio) score += 10;
  if ((profile.verifiedOutcomes || 0) > 0) score += 10;
  if ((profile.skills?.length || 0) >= 3) score += 10;
  if (profile.email) score += 10;
  if (profile.publicProfile?.visibility?.showBio !== false) score += 5;
  return Math.min(score, 100);
}

// ========== SUB-COMPONENTS ==========

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-xs font-medium hover:border-[var(--primary)]/40 transition-all duration-200"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      <span className="text-[var(--text)]">{copied ? 'Copied!' : label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, trend, emptyLabel, emptyCta }: {
  icon: ReactNode;
  label: string;
  value: number;
  trend?: string;
  emptyLabel?: string;
  emptyCta?: string;
}) {
  const isEmpty = value === 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4 transition-all duration-300 hover:border-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={10} />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        {isEmpty ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--text-muted)]">{emptyLabel || 'No data yet'}</p>
            {emptyCta && <p className="text-[10px] text-[var(--primary)]">{emptyCta}</p>}
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-[var(--text)]">{value.toLocaleString()}</p>
            <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

function VerificationChip({ verified, label }: { verified: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
      verified
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    }`}>
      {verified ? <BadgeCheck size={12} /> : <Circle size={10} />}
      {label}
    </span>
  );
}

function RankBadge({ rank }: { rank?: string }) {
  const gradient = getRankGradient(rank);
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-br ${gradient} px-3 py-1.5 shadow-lg`}>
      <Award size={14} className="text-white" />
      <span className="text-xs font-bold uppercase tracking-wider text-white">{rank || 'Applicant'}</span>
    </div>
  );
}

function TrustScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-[var(--border)]" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={`var(--${color})`}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-[var(--text)]">{score}</span>
        <span className="text-[9px] font-medium text-[var(--text-muted)]">/ 100</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, label, message }: { value: number; label: string; message?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text)]">{label}</span>
        <span className="text-sm font-bold text-[var(--primary)]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--card-subtle)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-1000 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      {message && <p className="text-xs text-[var(--text-muted)]">{message}</p>}
    </div>
  );
}

function TimelineItem({ completed, title, date }: { completed: boolean; title: string; date?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        completed ? 'bg-emerald-500 text-white' : 'border-2 border-[var(--border)]'
      }`}>
        {completed ? <Check size={12} /> : <Circle size={10} className="text-[var(--border)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${completed ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{title}</p>
        {date && <p className="text-xs text-[var(--text-muted)]">{date}</p>}
      </div>
    </div>
  );
}

// ========== MAIN COMPONENT ==========

export default function VerifiedGuildCard({ profile, profileUrl, label = 'Guild Passport' }: VerifiedGuildCardProps) {
  const [qrKey, setQrKey] = useState(0);
  const verifiedProofs = (profile.proofs || []).filter((p) => ['verified', 'approved'].includes(p.status)).length;
  const isVerified = profile.verificationStatus === 'verified';
  const location = getLocation(profile);
  const guildId = getGuildId(profile);
  const passportCompletion = calculatePassportCompletion(profile);
  const trustScore = calculateTrustScore(profile);

  async function shareProfile() {
    if (!profileUrl) return;
    const target = profileUrl.startsWith('http') || typeof window === 'undefined'
      ? profileUrl
      : `${window.location.origin}${profileUrl}`;
    if (navigator.share) {
      await navigator.share({ title: `${profile.fullName || 'Guild'} profile`, url: target });
      return;
    }
    await navigator.clipboard?.writeText(target);
  }

  function refreshQr() {
    setQrKey((k) => k + 1);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
      {/* Gold gradient top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)]" />

      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dcb36c' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zm0-30V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      <div className="relative space-y-6 p-5 md:p-6">
        {/* ========== HEADER SECTION ========== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Profile Photo with gold border */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--primary)] shadow-lg ring-2 ring-[var(--primary)]/20">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.fullName || 'Guild member'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--card-subtle)] text-2xl font-bold text-[var(--primary)]">
                    {profile.fullName?.charAt(0) || 'G'}
                  </div>
                )}
              </div>
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                  <BadgeCheck size={14} />
                </div>
              )}
            </div>

            {/* Name and role */}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{label}</p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text)] sm:text-2xl">
                {profile.fullName || 'Unnamed Member'}
              </h2>
              <p className="mt-0.5 text-sm font-medium text-[var(--text-muted)]">{formatRole(profile.role)}</p>
            </div>
          </div>

          {/* Rank Badge */}
          <RankBadge rank={profile.guildRank as string} />
        </div>

        {/* ========== VERIFICATION BADGES ========== */}
        <div className="flex flex-wrap gap-2">
          <VerificationChip verified={!!profile.email} label="Email Verified" />
          <VerificationChip verified={isVerified} label="Guild Verified" />
          <VerificationChip verified={!!profile.organizationName} label="Organization" />
          <VerificationChip verified={(profile.skills?.length || 0) > 0} label="Skills Added" />
        </div>

        {/* ========== INFO GRID ========== */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[var(--primary)]" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Organization</p>
              <p className="text-sm font-medium text-[var(--text)]">{profile.organizationName || 'Independent'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-[var(--primary)]" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Location</p>
              <p className="text-sm font-medium text-[var(--text)]">{location}</p>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <User size={14} className="text-[var(--primary)]" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Guild ID</p>
              <p className="text-sm font-mono font-medium text-[var(--text)]">{guildId}</p>
            </div>
          </div>
        </div>

        {/* ========== STATS SECTION ========== */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={<Briefcase size={18} />} label="Verified Proofs" value={verifiedProofs} emptyLabel="Share your work" emptyCta="Submit your first proof" />
          <StatCard icon={<Sparkles size={18} />} label="Quests" value={profile.completedQuests || 0} trend="+12%" emptyLabel="Start a quest" emptyCta="Browse quests" />
          <StatCard icon={<Target size={18} />} label="Outcomes" value={profile.verifiedOutcomes || 0} emptyLabel="Complete outcomes" emptyCta="Join a quest" />
          <StatCard icon={<Award size={18} />} label="Reputation" value={profile.reputationScore || 0} emptyLabel="Earn reputation" emptyCta="Complete quests" />
        </div>

        {/* ========== TRUST SCORE ========== */}
        <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
          <TrustScoreRing score={trustScore} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[var(--text)]">Trust Score</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Complete your profile, verify your identity, and add verified skills to increase your trust score.
            </p>
          </div>
        </div>

        {/* ========== PASSPORT PROGRESS ========== */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
          <ProgressBar
            value={passportCompletion}
            label="Passport Completion"
            message={passportCompletion < 100 ? 'Complete your passport to unlock higher trust and visibility.' : 'Your passport is complete! Great work.'}
          />
        </div>

        {/* ========== ACTIVITY TIMELINE ========== */}
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
          <h3 className="text-sm font-bold text-[var(--text)]">Activity Timeline</h3>
          <div className="space-y-3">
            <TimelineItem completed title="Joined Guild" date={profile.createdAt || 'Recently'} />
            <TimelineItem completed={isVerified} title="Profile Verified" date={isVerified ? 'Verified' : 'Pending'} />
            <TimelineItem completed={(profile.completedQuests || 0) > 0} title="First Quest Completed" />
            <TimelineItem completed={(profile.verifiedOutcomes || 0) > 0} title="First Outcome Delivered" />
            <TimelineItem completed={(profile.skills?.length || 0) >= 5} title="5 Skills Added" />
            <TimelineItem completed={false} title="Reach Rank A" />
          </div>
        </div>

        {/* ========== QR SECTION ========== */}
        {profileUrl && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">Scan to view verified passport</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshQr}
                className="rounded-lg p-2 hover:bg-[var(--card)] transition-colors"
                aria-label="Refresh QR code"
              >
                <RefreshCw size={14} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="mt-3 flex justify-center">
              <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                <img
                  key={qrKey}
                  src={getQrUrl(profileUrl, 160)}
                  alt="Guild public profile QR code"
                  className="h-32 w-32 md:h-40 md:w-40"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={getQrUrl(profileUrl, 640)}
                download="guild-passport-qr.png"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium hover:border-[var(--primary)]/40 transition-colors"
              >
                <Download size={14} />
                Download QR
              </a>
              <button
                type="button"
                onClick={shareProfile}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium hover:border-[var(--primary)]/40 transition-colors"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>
        )}

        {/* ========== PRIMARY ACTIONS ========== */}
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            to={profileUrl || '/profile'}
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--bg)] transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--primary)]/25"
          >
            <Globe size={16} />
            View Public Passport
            <ExternalLink size={14} />
          </Link>
          <button
            type="button"
            onClick={shareProfile}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-subtle)] px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--primary)]/40"
          >
            <Share2 size={16} />
            Share Passport
          </button>
        </div>

        {/* ========== FOOTER ========== */}
        <div className="flex items-center justify-center gap-2 border-t border-[var(--border)] pt-4">
          <QrCode size={13} className="text-[var(--primary)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Build. Verify. Rise.
          </span>
        </div>
      </div>
    </div>
  );
}