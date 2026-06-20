import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Award, ShieldCheck, ArrowRight, Zap, Target, BookOpen } from 'lucide-react';
import SEO, { PAGE_SEO } from '../components/SEO';

export default function Home() {
  const { firebaseUser, profile } = useAuth();

  return (
    <><SEO {...PAGE_SEO.home} />
    <div className="space-y-12 py-6 text-left max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="hero-panel text-center md:text-left py-12 md:py-16 px-6 md:px-12 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="space-y-5 max-w-2xl">
          <span className="eyebrow inline-flex bg-[var(--primary)]/10 px-3 py-1 rounded-full text-xs font-black">
            The Human Growth Engine
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-[var(--text)]">
            We ensure human potential is not wasted.
          </h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed font-normal">
            Guild is a civilized platform connecting builders, creators, and researchers with organizations.
            We help you become more <strong className="text-[var(--text)] font-extrabold">Capable</strong>, <strong className="text-[var(--text)] font-extrabold">Connected</strong>, and <strong className="text-[var(--text)] font-extrabold">Useful</strong>.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 justify-center md:justify-start">
            {firebaseUser ? (
              profile?.onboardingCompleted ? (
                <Link to="/" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <span>Go to Growth Dashboard</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/onboarding" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <span>Complete Onboarding</span>
                  <ArrowRight size={16} />
                </Link>
              )
            ) : (
              <>
                <Link to="/auth" className="primary px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <span>Join the Guild</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/quests" className="secondary px-6 py-3 rounded-xl font-semibold">
                  Browse Active Quests
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Small Visual Accent card */}
        <div className="panel bg-[var(--card)] border border-[var(--border-light)] p-6 max-w-xs space-y-4 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest block mb-0.5">Civilization Goal</span>
            <strong className="text-sm font-bold text-[var(--text)] block mb-1">Inter-Generational Growth</strong>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              We build systems where each generation starts stronger, more verified, and better connected than the previous one.
            </p>
          </div>
        </div>
      </section>

      {/* Under 30 Second Pitch Cards */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="panel flex flex-col justify-between p-6">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 mb-3">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-base font-bold">1. Verified Proof of Work</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Ditch traditional resumes. Every Quest completed is backed by submission documents, verified by community receptionists, and recorded directly on your public profile.
            </p>
          </div>
        </div>

        <div className="panel flex flex-col justify-between p-6">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 mb-3">
              <Target size={16} />
            </div>
            <h3 className="text-base font-bold">2. Local & Federated Hubs</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Whether you are in Ludhiana, Delhi, or Punjab, our branches provide real-world networks, local coordinator match support, and regional developmental impacts.
            </p>
          </div>
        </div>

        <div className="panel flex flex-col justify-between p-6">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 mb-3">
              <BookOpen size={16} />
            </div>
            <h3 className="text-base font-bold">3. Knowledge Repository</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every completed campaign uploads its playbook, template, and lessons learned to the Knowledge Hub, making civil intelligence open and search-accessible.
            </p>
          </div>
        </div>
      </section>

      {/* Growth Journey Steps */}
      <section className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
        <h2 className="text-2xl font-black text-center mb-8 tracking-tight">The Growth Journey</h2>
        <div className="grid sm:grid-cols-5 gap-4 relative">
          {[
            { step: 'Discover', desc: 'Browse local opportunities and branch projects.' },
            { step: 'Join', desc: 'Pass through the onboarding selection wizard.' },
            { step: 'Contribute', desc: 'Execute Quests assigned by matching engine.' },
            { step: 'Grow', desc: 'Earn reputation points, achievements, and ranks.' },
            { step: 'Lead', desc: 'Succeed to Receptionist or City Guild Master roles.' }
          ].map((item, idx) => (
            <div key={item.step} className="text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-xs font-black text-[var(--primary)] flex items-center justify-center mx-auto shadow-sm">
                0{idx + 1}
              </div>
              <strong className="text-sm font-bold block">{item.step}</strong>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed max-w-[150px] mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Global stats section */}
      <section className="grid sm:grid-cols-4 gap-6 text-center">
        <div className="panel p-5">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Active Members</span>
          <strong className="text-3xl font-extrabold text-[var(--text)] block mt-1">950+</strong>
        </div>
        <div className="panel p-5">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Completed Quests</span>
          <strong className="text-3xl font-extrabold text-[var(--text)] block mt-1">2,330</strong>
        </div>
        <div className="panel p-5">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Active Chapters</span>
          <strong className="text-3xl font-extrabold text-[var(--text)] block mt-1">3 Branches</strong>
        </div>
        <div className="panel p-5">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Outcomes Verified</span>
          <strong className="text-3xl font-extrabold text-[var(--text)] block mt-1">₹1.07 Cr</strong>
        </div>
      </section>
    </div></>
  );
}