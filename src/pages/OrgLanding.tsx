import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Target, BookOpen, Building, MessageSquare, Clipboard, Award, CheckCircle, Users, Workflow, BadgeCheck } from 'lucide-react';
import { PAGE_SEO } from '../components/SEO';

export default function OrgLanding() {
  const { profile } = useAuth();
  const registerPath = profile ? '/org-onboarding' : '/org-register';

  // SEO: Set page title
  useEffect(() => {
    document.title = PAGE_SEO.orgLanding.title;
  }, []);

  return (
    <div className="space-y-10 py-4 text-left max-w-6xl mx-auto animate-fade-up">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-emerald-500" />
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <span className="eyebrow inline-flex rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-black">
              Guild for Organizations
            </span>
            <div>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-[var(--text)] md:text-6xl">
                Convert real needs into verified work.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
                Guild gives organizations one operating path for intake, contributor coordination, relationship management, verified outcomes, and a public trust profile.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={registerPath} className="primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold">
                Register Organization <ArrowRight size={16} />
              </Link>
              <Link to="/organizations" className="secondary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold">
                View Organization Profiles
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TrustPoint icon={<ShieldCheck size={16} />} label="Relationship led" />
              <TrustPoint icon={<BadgeCheck size={16} />} label="Outcome verified" />
              <TrustPoint icon={<BookOpen size={16} />} label="Knowledge preserved" />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)] p-5">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Organization Workflow</p>
            <div className="mt-5 space-y-3">
              {[
                ['Register', 'Create an organization account and trust record.'],
                ['Submit Need', 'Describe the work, outcome, timeline, and priority.'],
                ['Coordinate Quest', 'Guild routes the work through contributors and review.'],
                ['Publish Outcome', 'Completed work becomes an auditable trust signal.']
              ].map(([title, body], index) => (
                <div key={title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-xs font-black text-[var(--primary)]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Use Cases</p>
            <h2 className="text-2xl font-black tracking-tight">Built for organizations with work that must become visible progress.</h2>
          </div>
          <Link to={registerPath} className="text-xs font-bold text-[var(--primary)] hover:underline">Start registration</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <SectorCard title="NGOs & Non-Profits" body="Coordinate campaigns, field research, volunteer operations, and public reporting with reviewed contributors." items={['Volunteer sourcing', 'Impact documentation', 'Campaign support']} />
          <SectorCard title="Startups & Labs" body="Turn product, engineering, research, and growth needs into scoped quests with reviewed proof." items={['Product prototypes', 'Technical reviews', 'Market research']} />
          <SectorCard title="Campuses & Institutions" body="Create applied learning loops where students complete real work and institutions track outcomes." items={['Student cohorts', 'Workshops', 'Partner projects']} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Feature icon={<Clipboard size={18} />} title="Need Intake" body="Structured forms capture goals, priority, budget, and timeline." />
        <Feature icon={<Workflow size={18} />} title="Quest Routing" body="Accepted needs move into work units with ownership and review." />
        <Feature icon={<Users size={18} />} title="Contributor Pool" body="Members build skills while organizations get practical execution." />
        <Feature icon={<Award size={18} />} title="Verified Outcomes" body="Completed work becomes a durable trust signal." />
      </section>

      <section className="panel flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black">Ready to make your organization legible to Guild?</h3>
          <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
            Register once, get a relationship path, and publish a profile that shows how your organization works with Guild.
          </p>
        </div>
        <Link to={registerPath} className="primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold">
          Get Started
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}

function TrustPoint({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">
      <span className="text-[var(--primary)]">{icon}</span>
      {label}
    </div>
  );
}

function SectorCard({ title, body, items }: { title: string; body: string; items: string[] }) {
  return (
    <div className="panel space-y-4 p-6">
      <strong className="block text-sm font-black uppercase tracking-wider text-[var(--primary)]">{title}</strong>
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
      <ul className="space-y-2 border-t border-[var(--border)] pt-3">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <CheckCircle size={13} className="text-emerald-500" /> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        {icon}
      </div>
      <h3 className="text-sm font-black">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{body}</p>
    </div>
  );
}
