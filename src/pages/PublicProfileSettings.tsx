import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, ExternalLink, Globe, Image, Link as LinkIcon, Save, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateLedgerRecord } from '../lib/repository';
import { getPublicGuildProfilePath } from '../lib/guildIdentity';
import type { PublicProfileSettings as PublicProfileSettingsType, PublicProfileSocialLinks } from '../types/guild';

const SOCIAL_FIELDS: { key: keyof PublicProfileSocialLinks; label: string }[] = [
  { key: 'personalWebsite', label: 'Personal Website' },
  { key: 'portfolioWebsite', label: 'Portfolio Website' },
  { key: 'github', label: 'GitHub' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X / Twitter' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'behance', label: 'Behance' },
  { key: 'dribbble', label: 'Dribbble' },
  { key: 'discord', label: 'Discord' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'medium', label: 'Medium' },
  { key: 'blog', label: 'Personal Blog' },
];

const SECTION_OPTIONS = ['identity', 'rank', 'skills', 'portfolio', 'organizations', 'outcomes', 'knowledge', 'timeline'];

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(normalizeUrl(value));
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export default function PublicProfileSettings() {
  const { profile } = useAuth();
  const existing = profile?.publicProfile || {};
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<PublicProfileSettingsType>({
    bannerUrl: existing.bannerUrl || '',
    headline: existing.headline || '',
    shortBio: existing.shortBio || profile?.bio || '',
    professionalSummary: existing.professionalSummary || '',
    profilePhotoUrl: existing.profilePhotoUrl || profile?.photoURL || '',
    socialLinks: { ...(existing.socialLinks || {}) },
    visibility: {
      showBio: existing.visibility?.showBio ?? true,
      showSocialLinks: existing.visibility?.showSocialLinks ?? true,
      showPersonalWebsite: existing.visibility?.showPersonalWebsite ?? true,
      showPortfolioWebsite: existing.visibility?.showPortfolioWebsite ?? true,
      showFeaturedSection: existing.visibility?.showFeaturedSection ?? true,
    },
    sectionOrder: existing.sectionOrder || SECTION_OPTIONS,
    featuredQuestId: existing.featuredQuestId || '',
    featuredOrganizationId: existing.featuredOrganizationId || '',
    featuredSkill: existing.featuredSkill || '',
    contactPreference: existing.contactPreference || '',
  });

  const publicUrl = profile ? getPublicGuildProfilePath(profile) : '';
  const verifiedSkills = profile?.verifiedSkills || [];

  const invalidLinks = useMemo(() => {
    const links = settings.socialLinks || {};
    return SOCIAL_FIELDS.filter((field) => !isValidOptionalUrl(String(links[field.key] || '')));
  }, [settings.socialLinks]);

  if (!profile) return null;
  const currentProfile = profile;

  function updateSocial(key: keyof PublicProfileSocialLinks, value: string) {
    setSettings((current) => ({
      ...current,
      socialLinks: {
        ...(current.socialLinks || {}),
        [key]: value,
      },
    }));
  }

  async function saveSettings() {
    if (invalidLinks.length) {
      setError(`Fix invalid URLs: ${invalidLinks.map((item) => item.label).join(', ')}`);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    const normalizedSocialLinks = Object.fromEntries(
      Object.entries(settings.socialLinks || {}).map(([key, value]) => [key, normalizeUrl(String(value || ''))])
    );

    try {
      await updateLedgerRecord(
        'users',
        currentProfile.uid,
        {
          bio: settings.shortBio || currentProfile.bio || '',
          photoURL: settings.profilePhotoUrl || currentProfile.photoURL || '',
          publicProfile: {
            ...settings,
            socialLinks: normalizedSocialLinks,
            featuredSkill: verifiedSkills.includes(settings.featuredSkill || '') ? settings.featuredSkill : '',
          },
          activityHistory: [...(currentProfile.activityHistory || []), 'Updated Public Guild Passport settings'],
        },
        currentProfile,
        'Update Public Guild Passport Settings'
      );
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError('Unable to save public profile settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 text-left animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Guild Passport</p>
          <h1 className="text-3xl font-black tracking-tight">Public Profile Settings</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Customize your introduction. Guild-verified facts remain public for trust.
          </p>
        </div>
        <Link to={publicUrl || '/profile'} className="secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold">
          <ExternalLink size={14} />
          Open Passport
        </Link>
      </div>

      {saved && <Status tone="success" text="Public profile settings saved." />}
      {error && <Status tone="error" text={error} />}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SettingsPanel icon={<User size={16} />} title="Identity">
            <Field label="Profile Photo URL" value={settings.profilePhotoUrl || ''} onChange={(value) => setSettings({ ...settings, profilePhotoUrl: value })} />
            <Field label="Profile Banner URL" value={settings.bannerUrl || ''} onChange={(value) => setSettings({ ...settings, bannerUrl: value })} />
            <Field label="Professional Headline" value={settings.headline || ''} onChange={(value) => setSettings({ ...settings, headline: value })} />
          </SettingsPanel>

          <SettingsPanel icon={<Image size={16} />} title="Biography">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Short Bio</label>
            <textarea
              value={settings.shortBio || ''}
              onChange={(event) => setSettings({ ...settings, shortBio: event.target.value })}
              rows={4}
              className="text-xs"
              maxLength={420}
            />
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Professional Summary</label>
            <textarea
              value={settings.professionalSummary || ''}
              onChange={(event) => setSettings({ ...settings, professionalSummary: event.target.value })}
              rows={4}
              className="text-xs"
              maxLength={800}
            />
          </SettingsPanel>

          <SettingsPanel icon={<Globe size={16} />} title="Social Links">
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={String(settings.socialLinks?.[field.key] || '')}
                  onChange={(value) => updateSocial(field.key, value)}
                  invalid={!isValidOptionalUrl(String(settings.socialLinks?.[field.key] || ''))}
                />
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel icon={<Eye size={16} />} title="Visibility">
            <p className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
              You may hide optional personal introduction sections. Guild ID, rank, XP, verified skills, verified work, organizations, outcomes, reputation, and timeline remain visible.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['showBio', 'Personal Bio'],
                ['showSocialLinks', 'Social Links'],
                ['showPersonalWebsite', 'Personal Website'],
                ['showPortfolioWebsite', 'Portfolio Website'],
                ['showFeaturedSection', 'Featured Section'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-xs font-bold">
                  {label}
                  <input
                    type="checkbox"
                    checked={Boolean(settings.visibility?.[key as keyof typeof settings.visibility])}
                    onChange={(event) => setSettings({
                      ...settings,
                      visibility: { ...(settings.visibility || {}), [key]: event.target.checked },
                    })}
                  />
                </label>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel icon={<ShieldCheck size={16} />} title="Portfolio">
            <Field label="Featured Quest ID" value={settings.featuredQuestId || ''} onChange={(value) => setSettings({ ...settings, featuredQuestId: value })} />
            <Field label="Featured Organization ID" value={settings.featuredOrganizationId || ''} onChange={(value) => setSettings({ ...settings, featuredOrganizationId: value })} />
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Featured Verified Skill</label>
            <select
              value={settings.featuredSkill || ''}
              onChange={(event) => setSettings({ ...settings, featuredSkill: event.target.value })}
              className="input w-full text-xs"
            >
              <option value="">No featured skill</option>
              {verifiedSkills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
            </select>
          </SettingsPanel>

          <SettingsPanel icon={<LinkIcon size={16} />} title="Preferences">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Display Order</label>
            <div className="flex flex-wrap gap-2">
              {(settings.sectionOrder || SECTION_OPTIONS).map((section, index) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => {
                    const next = [...(settings.sectionOrder || SECTION_OPTIONS)];
                    if (index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    setSettings({ ...settings, sectionOrder: next });
                  }}
                  className="badge badge-gray"
                >
                  {index + 1}. {section}
                </button>
              ))}
            </div>
          </SettingsPanel>

          <button onClick={saveSettings} disabled={saving} className="primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black">
            <Save size={15} />
            {saving ? 'Saving Passport...' : 'Save Public Profile Settings'}
          </button>
        </div>

        <aside className="space-y-6">
          <SettingsPanel icon={<Eye size={16} />} title="Live Preview">
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <div className="h-28 bg-[var(--card-subtle)]">
                {settings.bannerUrl ? <img src={settings.bannerUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="p-5">
                <div className="-mt-12 mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--card)] bg-[var(--primary)]/20 text-2xl font-black text-[var(--primary)]">
                  {settings.profilePhotoUrl ? <img src={settings.profilePhotoUrl} alt="" className="h-full w-full object-cover" /> : profile.fullName?.charAt(0)}
                </div>
                <p className="eyebrow">Guild Passport</p>
                <h2 className="text-xl font-black">{profile.fullName}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--primary)]">{settings.headline || `Rank ${profile.guildRank} Guild Member`}</p>
                {settings.visibility?.showBio && <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">{settings.shortBio || 'No public bio yet.'}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge badge-amber">{profile.guildRank}</span>
                  <span className="badge badge-green">{profile.verificationStatus}</span>
                  <span className="badge badge-blue">{profile.experiencePoints || 0} XP</span>
                </div>
              </div>
            </div>
          </SettingsPanel>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, invalid }: { label: string; value: string; onChange: (value: string) => void; invalid?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`input w-full text-xs ${invalid ? 'border-red-500' : ''}`}
      />
    </label>
  );
}

function SettingsPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="panel space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
        <span className="text-[var(--primary)]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Status({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-4 text-xs font-bold ${tone === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-red-500/25 bg-red-500/10 text-red-400'}`}>
      <Check size={16} />
      {text}
    </div>
  );
}
