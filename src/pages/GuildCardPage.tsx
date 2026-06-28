import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Check, Download, ExternalLink, Settings } from 'lucide-react';
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
    <div className="mx-auto max-w-4xl space-y-6 py-4 text-left animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Guild Card</p>
          <h1 className="text-3xl font-black tracking-tight">Verified Guild Card</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Your card is the entry point. The Guild Passport is the full verified identity.
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

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <VerifiedGuildCard profile={profile} profileUrl={passportPath} />
        <section className="panel space-y-4 p-6">
          <p className="eyebrow">Share Kit</p>
          <h2 className="text-xl font-black">Use this instead of a resume link</h2>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            The QR and link open your public Guild Passport. Future wallet, NFC, and digital pass exports can attach to this same identity route.
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
      </div>
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
      <span className="flex items-center gap-2 text-[var(--text)]">{copied && <Check size={13} className="text-[var(--trust)]" />}{copied ? 'Copied' : label}</span>
      <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">{value}</span>
    </button>
  );
}
