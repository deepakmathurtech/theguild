import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import type { Quest } from '../types/guild';
import { Compass, CheckCircle, XCircle, Clock, User, ChevronRight, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { nowIso } from '../lib/repository';

export default function QuestApplications() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Only receptionists and admins can manage
  const canManage = profile && ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'founder', 'guildFounder'].includes(profile.role);

  useEffect(() => {
    async function loadQuests() {
      try {
        const q = query(collection(db, 'quests'));
        const snapshot = await getDocs(q);
        const allQuests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quest));

        // Filter quests that have applicants and belong to this branch/jurisdiction
        let filtered = allQuests.filter(q => q.applicants && q.applicants.length > 0);

        if (!['founder', 'guildFounder', 'centralGuildMaster'].includes(profile?.role || '')) {
          // Filter by jurisdiction
          filtered = filtered.filter(q =>
            q.jurisdiction?.cityId === profile?.jurisdiction?.cityId ||
            q.jurisdiction?.stateId === profile?.jurisdiction?.stateId
          );
        }

        setQuests(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadQuests();
  }, [profile]);

  const handleAccept = async (questId: string, userId: string) => {
    if (!canManage) return;
    setProcessing(questId + userId);
    try {
      const questRef = doc(db, 'quests', questId);
      await updateDoc(questRef, {
        acceptedMembers: arrayUnion(userId),
        applicants: (await import('firebase/firestore')).arrayRemove(userId),
        updatedAt: nowIso()
      });
      // Refresh
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (questId: string, userId: string) => {
    if (!canManage) return;
    setProcessing(questId + userId);
    try {
      const questRef = doc(db, 'quests', questId);
      await updateDoc(questRef, {
        rejectedMembers: arrayUnion(userId),
        applicants: (await import('firebase/firestore')).arrayRemove(userId),
        updatedAt: nowIso()
      });
      // Refresh
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (!canManage) {
    return (
      <div className="p-12 text-center">
        <div className="panel max-w-md mx-auto">
          <p className="text-sm text-red-400">Access denied. Receptionist role required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        Loading quest applications...
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Quest Applications</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Review and manage member applications for your quests.
        </p>
      </div>

      {quests.length === 0 ? (
        <EmptyState
          title="No Pending Applications"
          description="There are no pending quest applications to review."
          whyItMatters="Review applications to assign members to your quests."
          icon={<Compass size={22} />}
        />
      ) : (
        <div className="space-y-4">
          {quests.map(quest => (
            <div key={quest.id} className="panel">
              <Link to={`/quests/${quest.id}`} className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                <div>
                  <div className="text-sm font-bold">{quest.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {quest.applicants?.length || 0} applicant(s)
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </Link>

              {/* Applicants */}
              {quest.applicants && quest.applicants.length > 0 && (
                <div className="space-y-2">
                  {quest.applicants.map(userId => (
                    <div key={userId} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                          <User size={14} className="text-[var(--primary)]" />
                        </div>
                        <div className="text-xs">
                          <div className="font-semibold">User ID: {userId.slice(0, 8)}...</div>
                          <div className="text-[var(--text-muted)]">Applicant</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(quest.id, userId)}
                          disabled={!!processing}
                          className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          title="Accept"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(quest.id, userId)}
                          disabled={!!processing}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}