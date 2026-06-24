import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchBranches, type BranchProfileData } from '../lib/repository';
import { MapPin, Users, Trophy, TrendingUp, ArrowRight, Building, Calendar, ShieldCheck } from 'lucide-react';
import SEO, { PAGE_SEO } from '../components/SEO';

export default function Branches() {
  const [selectedBranch, setSelectedBranch] = useState<BranchProfileData | null>(null);
  const [branches, setBranches] = useState<BranchProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await fetchBranches();
        setBranches(data);
      } catch (e) {
        console.error('Failed to load branches:', e);
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  return (
    <><SEO {...PAGE_SEO.branches} />
    <div className="space-y-8 py-8 px-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight mb-2">Guild Branch Network</h1>
        <p className="text-sm text-[var(--text-secondary)]">Explore our federation chapters across regions</p>
      </div>

      {/* Branch Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {loading ? (
        <div className="col-span-3 p-12 text-center text-xs text-[var(--text-muted)]">Loading branches...</div>
      ) : branches.map(branch => (
          <button
            key={branch.id}
            onClick={() => setSelectedBranch(branch)}
            className={`panel p-6 rounded-2xl border text-left transition-all hover:border-[var(--primary)]/50 ${selectedBranch?.id === branch.id ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)]'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                <MapPin size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-base font-bold">{branch.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{branch.city}, {branch.state}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4">{branch.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <Users size={12} /> {branch.statistics.activeMembers} members
              </div>
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <Trophy size={12} /> {branch.statistics.completedQuests} quests
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Branch Detail */}
      {selectedBranch && (
        <div className="mt-8 p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] animate-fade-up">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{selectedBranch.name}</h2>
              <p className="text-sm text-[var(--text-muted)]">{selectedBranch.city}, {selectedBranch.state}, {selectedBranch.country}</p>
            </div>
            <button onClick={() => setSelectedBranch(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]">
              Close
            </button>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mt-4 mb-6">{selectedBranch.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <Users size={16} className="mx-auto text-[var(--primary)] mb-1" />
              <div className="text-lg font-black">{selectedBranch.statistics.activeMembers}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Members</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <Trophy size={16} className="mx-auto text-[var(--primary)] mb-1" />
              <div className="text-lg font-black">{selectedBranch.statistics.completedQuests}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Quests</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <TrendingUp size={16} className="mx-auto text-emerald-400 mb-1" />
              <div className="text-lg font-black">{selectedBranch.statistics.trustScore}%</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Trust</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <ShieldCheck size={16} className="mx-auto text-amber-400 mb-1" />
              <div className="text-lg font-black">{selectedBranch.statistics.verifiedOutcomesValue}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase">Value</div>
            </div>
          </div>

          {/* Coordinator */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-black">
              {selectedBranch.localHubCoordinator.photoURL && (
                <img src={selectedBranch.localHubCoordinator.photoURL} alt={selectedBranch.localHubCoordinator.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold">{selectedBranch.localHubCoordinator.name}</div>
              <div className="text-xs text-[var(--text-muted)]">{selectedBranch.localHubCoordinator.role}</div>
            </div>
          </div>

          {/* Recruitment Status */}
          <div className="mt-4 p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
            <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">Recruitment Status</div>
            <div className="text-sm text-[var(--text-secondary)]">{selectedBranch.recruitmentStatus}</div>
          </div>
        </div>
      )}

      {/* All Branches Summary Table */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-wider">Branch Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase">Branch</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase">Location</th>
                <th className="text-right py-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase">Members</th>
                <th className="text-right py-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase">Quests</th>
                <th className="text-right py-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase">Trust</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
        <div className="col-span-3 p-12 text-center text-xs text-[var(--text-muted)]">Loading branches...</div>
      ) : branches.map(branch => (
                <tr key={branch.id} className="border-b border-[var(--border)] hover:bg-[var(--card-subtle)]/50">
                  <td className="py-3 px-4 font-bold">{branch.name}</td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">{branch.city}</td>
                  <td className="py-3 px-4 text-right font-semibold">{branch.statistics.activeMembers}</td>
                  <td className="py-3 px-4 text-right font-semibold">{branch.statistics.completedQuests}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-400">{branch.statistics.trustScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Join CTA */}
      <section className="text-center py-8">
        <Link to="/org-register" className="primary px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2">
          Register Your Organization <ArrowRight size={16} />
        </Link>
      </section>
    </div></>
  );
}