import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Copy,
  MapPin,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getPublicGuildId } from '../lib/guildIdentity';
import { ecosystemLinks } from '../lib/ecosystemLinks';
import { getRankProgress } from '../lib/rankProgression';
import type { GuildUser, KnowledgeArticle, Organization, Outcome, Quest, QuestSubmission } from '../types/guild';

type PublicProfileState = {
  user: GuildUser & { id?: string };
  submissions: QuestSubmission[];
  quests: Quest[];
  organizations: Organization[];
  outcomes: Outcome[];
  knowledge: KnowledgeArticle[];
};

async function findPublicUser(guildId: string) {
  const normalized = guildId.trim();

  const byAdventurer = await getDocs(query(collection(db, 'users'), where('adventurerId', '==', normalized), limit(1)));
  if (!byAdventurer.empty) {
    return { id: byAdventurer.docs[0].id, ...byAdventurer.docs[0].data() } as GuildUser & { id: string };
  }

  const byGuildId = await getDocs(query(collection(db, 'users'), where('guildId', '==', normalized), limit(1)));
  if (!byGuildId.empty) {
    return { id: byGuildId.docs[0].id, ...byGuildId.docs[0].data() } as GuildUser & { id: string };
  }

  const byUid = await getDoc(doc(db, 'users', normalized));
  if (byUid.exists()) {
    return { id: byUid.id, ...byUid.data() } as GuildUser & { id: string };
  }

  return null;
}

async function loadPublicProfile(guildId: string): Promise<PublicProfileState | null> {
  const user = await findPublicUser(guildId);
  if (!user?.uid) return null;

  const [submissionSnap, outcomeSnap, knowledgeSnap] = await Promise.all([
    getDocs(query(collection(db, 'questSubmissions'), where('memberId', '==', user.uid), where('status', '==', 'approved'), limit(24))),
    getDocs(query(collection(db, 'outcomes'), where('participants', 'array-contains', user.uid), limit(24))),
    getDocs(query(collection(db, 'knowledgeBase'), where('authorId', '==', user.uid), where('status', '==', 'published'), limit(12))),
  ]);

  const submissions = submissionSnap.docs.map((item) => ({ id: item.id, ...item.data() } as QuestSubmission));
  const outcomes = outcomeSnap.docs
    .map((item) => ({ id: item.id, ...item.data() } as Outcome))
    .filter((outcome) => ['verified', 'approved'].includes(String(outcome.verificationStatus)));
  const knowledge = knowledgeSnap.docs.map((item) => ({ id: item.id, ...item.data() } as KnowledgeArticle));

  const questIds = Array.from(new Set(submissions.map((submission) => submission.questId).filter(Boolean))).slice(0, 12);
  const quests = (await Promise.all(questIds.map(async (questId) => {
    const snap = await getDoc(doc(db, 'quests', questId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Quest) : null;
  }))).filter(Boolean) as Quest[];

  const organizationIds = Array.from(new Set([
    ...quests.map((quest) => quest.organizationId).filter(Boolean),
    ...outcomes.map((outcome) => outcome.organizationId).filter(Boolean),
  ])).slice(0, 12) as string[];
  const organizations = (await Promise.all(organizationIds.map(async (orgId) => {
    const snap = await getDoc(doc(db, 'organizations', orgId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null;
  }))).filter(Boolean) as Organization[];

  return { user, submissions, quests, organizations, outcomes, knowledge };
}

export default function PublicGuildProfile() {
  const params = useParams<{ guildId: string }>();
  const guildId = decodeURIComponent(params.guildId || '');
  const [state, setState] = useState<PublicProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await loadPublicProfile(guildId);
        if (!active) return;
        if (!result) {
          setState(null);
          setError('No public Guild profile was found for this ID.');
          return;
        }
        setState(result);
      } catch (err) {
        console.error(err);
        if (active) setError('Unable to load this public Guild profile.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [guildId]);

  const rankProgress = useMemo(() => {
    if (!state) return null;
    return getRankProgress(state.user.guildRank, state.user.experiencePoints || 0);
  }, [state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Loading public Guild profile...
      </div>
    );
  }

  if (error || !state) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-16 text-[var(--text)]">
        <section className="panel mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-black tracking-tight">Guild Profile Not Found</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">{error}</p>
          <Link to="/" className="primary mt-6 inline-flex rounded-xl px-4 py-2 text-xs font-bold">
            Return Home
          </Link>
        </section>
      </main>
    );
  }

  const { user, submissions, quests, organizations, outcomes, knowledge } = state;
  const publicGuildId = getPublicGuildId(user);
  const publicProfile = user.publicProfile || {};
  const visibility = {
    showBio: publicProfile.visibility?.showBio ?? true,
    showSocialLinks: publicProfile.visibility?.showSocialLinks ?? true,
    showPersonalWebsite: publicProfile.visibility?.showPersonalWebsite ?? true,
    showPortfolioWebsite: publicProfile.visibility?.showPortfolioWebsite ?? true,
    showFeaturedSection: publicProfile.visibility?.showFeaturedSection ?? true,
  };
  const socialLinks = publicProfile.socialLinks || {};
  const verifiedSkills = user.verifiedSkills || [];
  const verifiedSkillRecords = user.verifiedSkillRecords || [];
  const unverifiedSkills = (user.skills || []).filter((skill) => !verifiedSkills.includes(skill));
  const featuredQuest = publicProfile.featuredQuestId ? quests.find((quest) => quest.id === publicProfile.featuredQuestId) : null;
  const featuredOrganization = publicProfile.featuredOrganizationId ? organizations.find((org) => org.id === publicProfile.featuredOrganizationId) : null;
  const passportPath = `/g/${encodeURIComponent(publicGuildId)}`;
  const passportUrl = typeof window !== 'undefined' ? `${window.location.origin}${passportPath}` : passportPath;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(passportUrl)}`;

  async function copyPassportLink() {
    await navigator.clipboard?.writeText(passportUrl);
  }

  async function sharePassport() {
    if (navigator.share) {
      await navigator.share({ title: `${user.fullName} Guild Passport`, url: passportUrl });
      return;
    }
    await copyPassportLink();
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="panel relative overflow-hidden p-6 sm:p-8">
          {publicProfile.bannerUrl ? (
            <img src={publicProfile.bannerUrl} alt="" className="absolute inset-x-0 top-0 h-36 w-full object-cover opacity-25" />
          ) : null}
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--primary)]/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--primary)]/15 text-3xl font-black text-[var(--primary)]">
                {publicProfile.profilePhotoUrl || user.photoURL ? (
                  <img src={publicProfile.profilePhotoUrl || user.photoURL} alt={user.fullName} className="h-full w-full object-cover" />
                ) : (
                  user.fullName?.charAt(0)
                )}
              </div>
              <div>
                <p className="eyebrow">Guild Passport</p>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{user.fullName}</h1>
                <p className="mt-1 text-sm font-bold text-[var(--primary)]">
                  {publicProfile.headline || `Rank ${user.guildRank || 'F'} verified Guild contributor`}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {visibility.showBio
                    ? publicProfile.shortBio || user.bio || 'Verified Guild member building a public proof-of-work record through completed quests and outcomes.'
                    : 'This member keeps their personal introduction private. Their verified Guild record remains public.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="badge badge-amber">{publicGuildId}</span>
                  <span className="badge badge-blue">Rank {user.guildRank || 'F'}</span>
                  <span className="badge badge-green"><BadgeCheck size={12} /> {user.verificationStatus || 'pending'}</span>
                  <span className="trust-badge"><ShieldCheck size={12} /> Verified Proof Record</span>
                </div>
                {visibility.showSocialLinks && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(socialLinks)
                      .filter(([key, value]) => Boolean(value) && (visibility.showPersonalWebsite || key !== 'personalWebsite') && (visibility.showPortfolioWebsite || key !== 'portfolioWebsite'))
                      .map(([key, value]) => (
                        <a key={key} href={String(value)} target="_blank" rel="noreferrer" className="badge badge-gray">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </a>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 lg:min-w-[420px]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PublicStat label="XP" value={user.experiencePoints || 0} icon={<Sparkles size={15} />} />
                <PublicStat label="Reputation" value={user.reputationScore || 0} icon={<TrendingUp size={15} />} />
                <PublicStat label="Verified Work" value={submissions.length} icon={<Briefcase size={15} />} />
                <PublicStat label="Outcomes" value={outcomes.length} icon={<ShieldCheck size={15} />} />
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white p-1">
                    <img src={qrUrl} alt="Guild Passport QR code" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--primary)]"><QrCode size={12} /> Share Passport</p>
                    <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{passportUrl}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={copyPassportLink} className="secondary rounded-lg px-2.5 py-1.5 text-[10px] font-bold"><Copy size={11} /> Copy</button>
                      <button type="button" onClick={sharePassport} className="secondary rounded-lg px-2.5 py-1.5 text-[10px] font-bold"><Share2 size={11} /> Share</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <TrustCard title="Verified by Guild" body="Rank, XP, verified skills, outcomes, and completed quests are system-controlled facts." icon={<ShieldCheck size={15} />} />
          <TrustCard title="Proof Over Claims" body="Each public record points back to real Guild activity rather than free-form resume text." icon={<BadgeCheck size={15} />} />
          <TrustCard title="Built Over Time" body="This Passport grows through contribution history, knowledge, organizations, and rank progression." icon={<TrendingUp size={15} />} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Rank Progress</p>
                <h2 className="text-xl font-black">{rankProgress?.current.label}</h2>
              </div>
              {rankProgress?.eligibleForExam && <span className="badge badge-amber">Rank Examination Available</span>}
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--card-subtle)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${rankProgress?.percent || 0}%` }} />
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {rankProgress?.next
                ? `${rankProgress.xpToNext.toLocaleString()} XP to become eligible for ${rankProgress.next.label}.`
                : 'Highest configured rank band reached.'}
            </p>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Guild Identity</p>
            <div className="mt-4 grid gap-3 text-sm">
              <IdentityRow icon={<MapPin size={15} />} label="Branch" value={user.branchName || user.jurisdiction?.cityName || 'Branch pending'} />
              <IdentityRow icon={<Calendar size={15} />} label="Guild Since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unavailable'} />
              <IdentityRow icon={<Award size={15} />} label="Current Role" value={user.role || 'member'} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <PublicPanel title="Verified Skills" empty="No verified skills have been earned yet.">
            {verifiedSkills.map((skill) => {
              const source = verifiedSkillRecords.find((record) => record.skill === skill);
              return (
                <div key={skill} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <span className="badge badge-green">{skill}</span>
                  <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
                    Verified through {source?.sourceTitle || 'Guild verified work'}
                    {source?.organizationName ? ` with ${source.organizationName}` : ''}
                    {source?.verifiedAt ? ` on ${new Date(source.verifiedAt).toLocaleDateString()}` : ''}.
                  </p>
                </div>
              );
            })}
          </PublicPanel>
          <PublicPanel title="Unverified Listed Skills" empty="No self-listed skills are public yet.">
            {unverifiedSkills.map((skill) => <span key={skill} className="badge badge-gray">{skill}</span>)}
          </PublicPanel>
        </section>

        {visibility.showFeaturedSection && (featuredQuest || featuredOrganization || publicProfile.featuredSkill) && (
          <section className="panel p-6">
            <p className="eyebrow">Featured</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {featuredQuest && <Feature label="Quest" value={featuredQuest.title} href={ecosystemLinks.quest(featuredQuest)} />}
              {featuredOrganization && <Feature label="Organization" value={featuredOrganization.name} href={ecosystemLinks.organization(featuredOrganization)} />}
              {publicProfile.featuredSkill && <Feature label="Verified Skill" value={publicProfile.featuredSkill} />}
            </div>
          </section>
        )}

        <section className="panel p-6">
          <p className="eyebrow">Recent Verified Work</p>
          <div className="mt-5 grid gap-3">
            {submissions.length ? submissions.slice(0, 8).map((submission) => {
              const quest = quests.find((item) => item.id === submission.questId);
              return (
                <article key={submission.id} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      {quest ? (
                        <Link to={ecosystemLinks.quest(quest)} className="text-sm font-black text-[var(--text)] hover:text-[var(--primary)]">
                          {submission.questTitle || quest.title || 'Verified Quest'}
                        </Link>
                      ) : (
                        <h3 className="text-sm font-black">{submission.questTitle || 'Verified Quest'}</h3>
                      )}
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                        {quest?.organizationName || 'Guild verified'} {submission.reviewedAt ? `- ${new Date(submission.reviewedAt).toLocaleDateString()}` : ''}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                        {submission.summary || submission.report || quest?.expectedOutcome || 'Verified contribution recorded by the Guild.'}
                      </p>
                    </div>
                    <span className="badge badge-green">Guild Verified</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(submission.achievements || []).slice(0, 4).map((item) => <span key={item} className="badge badge-blue">{item}</span>)}
                  </div>
                </article>
              );
            }) : <p className="text-sm text-[var(--text-muted)]">No verified quest work is public yet.</p>}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <PublicPanel title="Organizations Worked With" empty="No verified organization links yet.">
            {organizations.map((org) => <Link key={org.id} to={ecosystemLinks.organization(org)} className="badge badge-blue"><Building2 size={12} /> {org.name}</Link>)}
          </PublicPanel>
          <PublicPanel title="Verified Outcomes" empty="No public verified outcomes yet.">
            {outcomes.map((outcome) => <span key={outcome.id} className="badge badge-green">{outcome.title}</span>)}
          </PublicPanel>
          <PublicPanel title="Knowledge Contributions" empty="No public knowledge contributions yet.">
            {knowledge.map((article) => <Link key={article.id} to={ecosystemLinks.knowledge(article)} className="badge badge-amber"><BookOpen size={12} /> {article.title}</Link>)}
          </PublicPanel>
        </section>
      </div>
    </main>
  );
}

function PublicStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
      <div className="flex items-center gap-2 text-[var(--primary)]">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}

function TrustCard({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <div className="trust-card">
      <span className="trust-badge">{icon}{title}</span>
      <p>{body}</p>
    </div>
  );
}

function IdentityRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--card-subtle)] px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">{icon}{label}</span>
      <span className="text-right text-xs font-bold">{value}</span>
    </div>
  );
}

function Feature({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      {href ? <Link to={href} className="mt-2 block text-sm font-black hover:text-[var(--primary)]">{value}</Link> : <p className="mt-2 text-sm font-black">{value}</p>}
    </div>
  );
}

function PublicPanel({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="panel p-6">
      <p className="eyebrow">{title}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {hasChildren ? children : <p className="text-sm text-[var(--text-muted)]">{empty}</p>}
      </div>
    </section>
  );
}
