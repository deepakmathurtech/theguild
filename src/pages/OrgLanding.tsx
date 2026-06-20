import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Zap, Target, BookOpen, Building, MessageSquare, Clipboard } from 'lucide-react';
import { PAGE_SEO } from '../components/SEO';

export default function OrgLanding() {
  const { profile } = useAuth();

  // SEO: Set page title
  useEffect(() => {
    document.title = PAGE_SEO.orgLanding.title;
  }, []);

  return (
    <div className="space-y-12 py-6 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Hero section */}
      <section className="hero-panel text-center md:text-left py-12 md:py-16 px-6 md:px-12 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="space-y-5 max-w-2xl">
          <span className="eyebrow inline-flex bg-[var(--primary)]/10 px-3 py-1 rounded-full text-xs font-black">
            Guild for Organizations
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-[var(--text)]">
            Deploy verified contractor cohorts in minutes.
          </h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed font-normal">
            Need developers, product designers, campaign managers, or policy auditors? Guild matches your needs to vetted cohorts and handles coordination logs under direct receptionist stewardship.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 justify-center md:justify-start">
            {profile ? (
              <Link to="/org-onboarding" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <span>Register Your Organization</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/org-register" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <span>Register Your Organization</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* Visual Support card */}
        <div className="panel bg-[var(--card)] border border-[var(--border-light)] p-5 max-w-xs space-y-3.5 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block mb-0.5">Trust Layer</span>
            <strong className="text-sm font-bold text-[var(--text)] block mb-1">Receptionist Led Stewardship</strong>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every deployment gets an assigned Relationship Manager. We log deliverables and audit outcomes. No ticket queues.
            </p>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-wider text-center mb-6">Tailored Services By Sector</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="panel p-6 space-y-3">
            <strong className="text-sm font-black text-[var(--primary)] uppercase tracking-wider block">NGOs & Non-Profits</strong>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-normal">
              Scale community campaigns, volunteer coordination, and regional mapping efforts with verified student and professional workforces.
            </p>
            <ul className="text-xs text-[var(--text-secondary)] font-semibold space-y-1.5 pt-2 border-t border-[var(--border)]">
              <li>• Sourcing volunteers</li>
              <li>• Outcome campaign audits</li>
              <li>• Public awareness projects</li>
            </ul>
          </div>

          <div className="panel p-6 space-y-3">
            <strong className="text-sm font-black text-[var(--primary)] uppercase tracking-wider block">Startups & Labs</strong>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-normal">
              Acquire software engineering, UI designs, documentation, and user feedback cohorts without complex hiring paperwork.
            </p>
            <ul className="text-xs text-[var(--text-secondary)] font-semibold space-y-1.5 pt-2 border-t border-[var(--border)]">
              <li>• Frontend developer cohorts</li>
              <li>• Product design feedback</li>
              <li>• Rapid technical reviews</li>
            </ul>
          </div>

          <div className="panel p-6 space-y-3">
            <strong className="text-sm font-black text-[var(--primary)] uppercase tracking-wider block">Colleges & Universities</strong>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-normal">
              Build campus hubs, connect students directly with partner corporations, and support practical engineering campaigns.
            </p>
            <ul className="text-xs text-[var(--text-secondary)] font-semibold space-y-1.5 pt-2 border-t border-[var(--border)]">
              <li>• Industry apprenticeship matching</li>
              <li>• Technical workshops</li>
              <li>• Campus leadership roles</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Simple features list */}
      <section className="panel p-8 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Ready to see what Guild can do for your projects?</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xl">
            Pass through our 3-step organization wizard to configure your sector needs, match your receptionist manager, and set up your active needs panel.
          </p>
        </div>
        <Link to="/org-onboarding" className="secondary px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap text-xs">
          <span>Get Started</span>
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
