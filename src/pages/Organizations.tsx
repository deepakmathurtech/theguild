import { useState, useEffect } from 'react';
import { fetchOrganizations } from '../lib/repository';
import type { Organization } from '../types/guild';
import { Link } from 'react-router-dom';
import { Building, ShieldCheck, Mail, ArrowRight, Plus } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import SEO, { PAGE_SEO } from '../components/SEO';

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchOrganizations();
        setOrgs(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <><SEO {...PAGE_SEO.organizations} />
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Pitch banner */}
      <div className="hero-panel bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)] p-8 rounded-2xl flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div>
          <span className="eyebrow block">Guild Services</span>
          <h1 className="text-3xl font-black tracking-tight mt-0.5">What can Guild do for your projects?</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-lg leading-relaxed font-normal">
            We match NGO, Startup, College, and Business initiatives with vetted developer cohorts, research networks, and event managers to drive community outcomes.
          </p>
        </div>

        <div className="flex gap-3 whitespace-nowrap">
          <Link to="/org-landing" className="secondary px-4 py-2 rounded-xl text-xs font-semibold">
            Service Details
          </Link>
          <Link to="/org-onboarding" className="primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1">
            <Plus size={14} /> Register Org
          </Link>
        </div>
      </div>

      {/* Directory listing */}
      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wider">Registered Directory</h2>
        
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">Retrieving organizations directory...</div>
        ) : orgs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {orgs.map(o => (
              <div key={o.id} className="panel p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
                      {o.category}
                    </span>
                    <span className={`text-[9px] uppercase font-black tracking-wider flex items-center gap-0.5 ${o.trustLevel === 'verified' || o.trustLevel === 'partner' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <ShieldCheck size={10} /> {o.trustLevel}
                    </span>
                  </div>

                  <div>
                    <strong className="text-base font-extrabold text-[var(--text)] block">{o.name}</strong>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 font-semibold">
                      Chapter: {o.city || 'Global Hub'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">{o.description}</p>
                </div>

                <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1">
                    <Mail size={11} /> {o.email || 'No email provided'}
                  </span>
                  
                  <Link to="/org-dashboard" className="text-[var(--primary)] font-bold hover:underline flex items-center gap-0.5">
                    Launch Hub Space <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Organizations Registered"
            description="There are currently no certified organizations registered in this branch directory."
            whyItMatters="Organizations are the entities that source and fund quest campaigns. Without registered groups, members have no external tasks to claim."
            actionText="Be the First to Register"
            onAction={() => window.location.href = '/org-onboarding'}
            icon={<Building size={22} />}
          />
        )}
      </section>
    </div></>
  );
}
