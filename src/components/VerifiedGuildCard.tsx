import { Award, BadgeCheck, Briefcase, ExternalLink, MapPin, QrCode, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ProofStatus = 'pending' | 'verified' | 'approved' | 'rejected';

export type VerifiedGuildCardProfile = {
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
  reputationScore?: number;
  experiencePoints?: number;
  completedQuests?: number;
  verifiedOutcomes?: number;
  proofs?: {
    id: string;
    title: string;
    status: ProofStatus;
  }[];
};

type VerifiedGuildCardProps = {
  profile: VerifiedGuildCardProfile;
  profileUrl?: string;
  label?: string;
};

function formatRole(role?: string) {
  if (!role) return 'Guild Member';
  return role
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getGuildId(profile: VerifiedGuildCardProfile) {
  return profile.adventurerId || profile.guildId || profile.uid || profile.id || 'Pending';
}

function getQrUrl(profileUrl: string) {
  const target = typeof window === 'undefined' || profileUrl.startsWith('http')
    ? profileUrl
    : `${window.location.origin}${profileUrl}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=144x144&margin=10&data=${encodeURIComponent(target)}`;
}

export default function VerifiedGuildCard({
  profile,
  profileUrl,
  label = 'Verified Guild Card',
}: VerifiedGuildCardProps) {
  const verifiedProofs = (profile.proofs || []).filter((proof) =>
    ['verified', 'approved'].includes(proof.status)
  ).length;
  const isVerified = profile.verificationStatus === 'verified' || profile.verificationStatus === 'approved';
  const location =
    profile.branchName ||
    profile.jurisdiction?.cityName ||
    profile.city ||
    'Branch pending';
  const guildId = getGuildId(profile);

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

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#ead7ad] p-5 text-[#24160d] shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top_left,#2f1f12,transparent_35%)]" />
      <div className="absolute right-0 top-0 h-20 w-20 border-b border-l border-black/10 bg-gradient-to-bl from-[#f8e9c7] to-[#caa86e]" />
      <div className="absolute -right-10 bottom-0 text-[108px] font-black leading-none text-black/[0.04]">
        {profile.guildRank || 'G'}
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#745326]">
              {label}
            </p>
            <h2 className="mt-3 text-xl font-black leading-tight sm:text-2xl">
              {profile.fullName || 'Unnamed Member'}
            </h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#745326]">
              {formatRole(profile.role)}
            </p>
          </div>

          <div className="rotate-6 border-2 border-[#8f6727] px-3 py-1 text-xs font-black tracking-[0.18em] text-[#8f6727]">
            RANK {profile.guildRank || 'N/A'}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-y border-black/10 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-black/10 text-xl font-black">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.fullName || 'Guild member'} className="h-full w-full object-cover" />
            ) : (
              profile.fullName?.charAt(0) || 'G'
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${
                isVerified
                  ? 'border-emerald-800/30 bg-emerald-700/10 text-emerald-800'
                  : 'border-amber-900/30 bg-amber-700/10 text-amber-900'
              }`}>
                {isVerified ? <BadgeCheck size={12} /> : <ShieldCheck size={12} />}
                {isVerified ? 'Verified' : 'Pending Review'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#745326]">
                <MapPin size={12} />
                {location}
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-black tracking-[0.12em] text-[#5f4632]">{guildId}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <CardMetric icon={<Briefcase size={14} />} label="Proofs" value={verifiedProofs} />
          <CardMetric icon={<Award size={14} />} label="Quests" value={profile.completedQuests || 0} />
          <CardMetric icon={<ShieldCheck size={14} />} label="Outcomes" value={profile.verifiedOutcomes || 0} />
          <CardMetric icon={<Sparkles size={14} />} label="Reputation" value={profile.reputationScore || 0} />
        </div>

        {profileUrl && (
          <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-stretch">
            <div className="flex items-center justify-center rounded-lg border border-black/10 bg-white p-2">
              <img src={getQrUrl(profileUrl)} alt="Guild public profile QR code" className="h-28 w-28" />
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to={profileUrl}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-[#24160d] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition hover:bg-[#24160d] hover:text-[#ead7ad]"
              >
                Public Profile
                <ExternalLink size={14} />
              </Link>
              <button
                type="button"
                onClick={shareProfile}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/20 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition hover:bg-black/10"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>
        )}

        <p className="mt-5 flex items-center justify-center gap-2 border-t border-black/10 pt-4 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#745326]">
          <QrCode size={13} /> Build. Verify. Rise.
        </p>
      </div>
    </section>
  );
}

function CardMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.04] p-3">
      <div className="flex items-center gap-2 text-[#745326]">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}