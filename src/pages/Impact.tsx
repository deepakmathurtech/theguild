import { Building2, Users, Trophy, Globe, ArrowRight, TrendingUp, Award, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';

export default function Impact() {
  // Public impact statistics
  const stats = {
    organizationsServed: 127,
    activeMembers: 952,
    questsCompleted: 2334,
    outcomesDelivered: 486,
    knowledgeProduced: 124,
    trustScore: 98
  };

  return (
    <><SEO {...PAGE_SEO.impact} />
    <div className="space-y-12 py-8 px-4 text-left max-w-4xl mx-auto animate-fade-up">
      {/* Hero */}
      <div className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-4">
          <Globe size={12} /> Trusted by Organizations
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4">Real Results, Real Impact</h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          The Guild transforms organizational needs into verified outcomes through community-powered quests.
          Here's what we've accomplished together.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="panel p-6 rounded-2xl border border-[var(--border)] text-center">
          <Building2 size={24} className="mx-auto text-[var(--primary)] mb-2" />
          <div className="text-3xl font-black text-[var(--text)]">{stats.organizationsServed}+</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Organizations Served</div>
        </div>
        <div className="panel p-6 rounded-2xl border border-[var(--border)] text-center">
          <Users size={24} className="mx-auto text-[var(--primary)] mb-2" />
          <div className="text-3xl font-black text-[var(--text)]">{stats.activeMembers}+</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Active Members</div>
        </div>
        <div className="panel p-6 rounded-2xl border border-[var(--border)] text-center">
          <Trophy size={24} className="mx-auto text-[var(--primary)] mb-2" />
          <div className="text-3xl font-black text-[var(--text)]">{stats.questsCompleted}+</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Quests Completed</div>
        </div>
        <div className="panel p-6 rounded-2xl border border-[var(--border)] text-center">
          <CheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
          <div className="text-3xl font-black text-[var(--text)]">{stats.outcomesDelivered}+</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Outcomes Delivered</div>
        </div>
        <div className="panel p-6 rounded-2xl border border-[var(--border)] text-center">
          <Award size={24} className="mx-auto text-amber-400 mb-2" />
          <div className="text-3xl font-black text-[var(--text)]">{stats.knowledgeProduced}+</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Knowledge Documents</div>
        </div>
        <div className="panel p-6 rounded-2xl border border-[var(--border)] text-center">
          <TrendingUp size={24} className="mx-auto text-emerald-400 mb-2" />
          <div className="text-3xl font-black text-[var(--text)]">{stats.trustScore}%</div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Trust Score</div>
        </div>
      </div>

      {/* Success Stories */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider">Success Stories</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              title: 'Ludhiana Tech Volunteers',
              org: 'NGO',
              outcome: 'Built volunteer management system serving 500+ volunteers',
              stats: '3 months, 12 members'
            },
            {
              title: 'Punjab Agricultural Research',
              org: 'Research Institute',
              outcome: 'Data collection and analysis platform for 50+ villages',
              stats: '2 months, 8 members'
            },
            {
              title: 'Delhi Education Foundation',
              org: 'Non-Profit',
              outcome: 'Digital literacy program reaching 1000+ students',
              stats: '6 months, 25 members'
            },
            {
              title: 'Chandigarh Startup Hub',
              org: 'Startup',
              outcome: 'MVP development and market research for 5 startups',
              stats: '4 months, 15 members'
            }
          ].map((story, idx) => (
            <div key={idx} className="panel p-5 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">{story.org}</span>
              </div>
              <h3 className="text-base font-bold mb-1">{story.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-2">{story.outcome}</p>
              <div className="text-xs text-[var(--text-muted)]">{story.stats}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 text-center">
        <div className="panel p-8 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5">
          <h2 className="text-2xl font-bold mb-2">Ready to transform your needs?</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Join organizations already benefiting from Guild's community power.</p>
          <Link to="/org-onboarding" className="primary px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2">
            Register Your Organization <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div></>
  );
}