import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import type { Quest } from '../types/guild';
import { Compass, CheckCircle, Clock, AlertCircle, ChevronRight, Award } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function MyQuests() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMyQuests() {
      if (!profile) return;
      try {
        // Fetch quests where user is applicant or member
        const q = query(
          collection(db, 'quests'),
          where('archiveStatus', '==', 'active')
        );
        const snapshot = await getDocs(q);
        const allQuests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quest));

        // Filter locally for user's quests
        const myQuests = allQuests.filter(q =>
          q.applicants?.includes(profile.uid) ||
          q.acceptedMembers?.includes(profile.uid) ||
          q.completedMembers?.includes(profile.uid)
        );
        setQuests(myQuests);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMyQuests();
  }, [profile]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        Loading your quest applications...
      </div>
    );
  }

  const appliedQuests = quests.filter(q => q.applicants?.includes(profile?.uid || ''));
  const acceptedQuests = quests.filter(q => q.acceptedMembers?.includes(profile?.uid || ''));
  const completedQuests = quests.filter(q => q.completedMembers?.includes(profile?.uid || ''));

  return (
    <div className="space-y-8 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      <div>
        <h1 className="text-2xl font-black tracking-tight">My Quests</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Track your quest applications, active assignments, and completed work.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel text-center">
          <div className="text-2xl font-black text-amber-400">{appliedQuests.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Pending</div>
        </div>
        <div className="panel text-center">
          <div className="text-2xl font-black text-[var(--primary)]">{acceptedQuests.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Active</div>
        </div>
        <div className="panel text-center">
          <div className="text-2xl font-black text-emerald-400">{completedQuests.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Completed</div>
        </div>
      </div>

      {/* Quest Lists */}
      {quests.length === 0 ? (
        <EmptyState
          title="No Quest Applications"
          description="You haven't applied for any quests yet. Browse the Quest Board to find opportunities."
          whyItMatters="Quests help you gain experience and reputation to grow your rank within the guild."
          actionText="Browse Quests"
          onAction={() => { window.location.href = '/quests'; }}
          icon={<Compass size={22} />}
        />
      ) : (
        <div className="space-y-6">
          {/* Pending Applications */}
          {appliedQuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Clock size={14} /> Pending Applications
              </h2>
              <div className="space-y-2">
                {appliedQuests.map(q => (
                  <Link key={q.id} to={`/quests/${q.id}`} className="panel flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                    <div>
                      <div className="text-sm font-bold">{q.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{q.category} • {q.difficulty}</div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active Quests */}
          {acceptedQuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--primary)] flex items-center gap-2">
                <Compass size={14} /> Active Assignments
              </h2>
              <div className="space-y-2">
                {acceptedQuests.map(q => (
                  <Link key={q.id} to={`/quests/${q.id}`} className="panel flex items-center justify-between p-4 hover:shadow-md transition-shadow border-l-2 border-[var(--primary)]">
                    <div>
                      <div className="text-sm font-bold">{q.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {q.estimatedHours || 12} hours • +{q.reputationPoints} Rep
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedQuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Award size={14} /> Completed
              </h2>
              <div className="space-y-2">
                {completedQuests.map(q => (
                  <Link key={q.id} to={`/quests/${q.id}`} className="panel flex items-center justify-between p-4 opacity-70">
                    <div>
                      <div className="text-sm font-bold">{q.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        +{q.reputationPoints} Rep earned
                      </div>
                    </div>
                    <CheckCircle size={16} className="text-emerald-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}