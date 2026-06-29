import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Award, BadgeCheck, Check, Copy, Download, ExternalLink, QrCode, Settings, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VerifiedGuildCard from '../components/VerifiedGuildCard';
import { getPublicGuildProfilePath } from '../lib/guildIdentity';

export default function GuildCardPage() {
  const { profile } = useAuth();

  if (!profile) return null;

  const passportPath = getPublicGuildProfilePath(profile);
  const passportUrl = typeof window !== 'undefined' ? `${window.location.origin}${passportPath}` : passportPath;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encodeURIComponent(passportUrl)}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-4 text-left animate-fade-up">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-emerald-500" />
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow">Guild Card</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Adventurer Record</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              A compact, shareable card for your public Guild Passport. The card opens your verified identity, quest proof, outcomes, and contribution record.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/profile" className="secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold">
              <ArrowLeft size={14} />
              Profile
            </Link>
            <Link to="/public-profile-settings" className="secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold">
              <Settings size={14} />
              Passport Settings
            </Link>
            <Link to={passportPath} className="primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold">
              <ExternalLink size={14} />
              Open Passport
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <RecordStat icon={<BadgeCheck size={15} />} label="Status" value={profile.verificationStatus === 'verified' ? 'Verified' : 'Pending'} />
          <RecordStat icon={<Award size={15} />} label="Rank" value={profile.guildRank || 'Applicant'} />
          <RecordStat icon={<ShieldCheck size={15} />} label="Reputation" value={String(profile.reputationScore || 0)} />
          <RecordStat icon={<Sparkles size={15} />} label="Quests" value={String(profile.completedQuests || 0)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
          <VerifiedGuildCard profile={profile} profileUrl={passportPath} />
        </div>
        <div className="space-y-6">
          <section className="panel space-y-4 p-6">
            <p className="eyebrow">Share Kit</p>
            <h2 className="text-2xl font-black">Use this instead of a resume link</h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              The QR and link open your public Guild Passport. Keep this page ready for applications, introductions, and proof-of-work sharing.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ShareButton label="Copy Passport Link" value={passportUrl} />
              <ShareButton label="Copy Guild ID" value={profile.adventurerId || profile.guildId || profile.uid} />
              <a href={qrUrl} download="guild-passport-qr.png" className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-4 py-3 text-left text-xs font-bold hover:border-[var(--primary)]/40">
                <span className="flex items-center gap-2 text-[var(--text)]"><Download size={13} /> Download QR</span>
                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">High resolution Passport QR</span>
              </a>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <ArchiveTile icon={<QrCode size={16} />} title="Scan" body="Anyone can open your public Passport from the card QR." />
            <ArchiveTile icon={<ShieldCheck size={16} />} title="Verify" body="Your status, rank, and proof record are visible in context." />
            <ArchiveTile icon={<ExternalLink size={16} />} title="Share" body="Use the same identity link across applications and intros." />
          </section>
        </div>
      </div>
    </div>
  );
}

function RecordStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-3">
      <div className="flex items-center gap-2 text-[var(--primary)]">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-sm font-black text-[var(--text)]">{value}</p>
    </div>
  );
}

function ArchiveTile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        {icon}
      </div>
      <h3 className="text-sm font-black">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{body}</p>
    </div>
  );
}


function ShareButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-4 py-3 text-left text-xs font-bold hover:border-[var(--primary)]/40"
    >
      <span className="flex items-center gap-2 text-[var(--text)]">
        {copied ? <Check size={13} className="text-[var(--trust)]" /> : <Copy size={13} />}
        {copied ? 'Copied' : label}
      </span>
      <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">{value}</span>
    </button>
  );
}
