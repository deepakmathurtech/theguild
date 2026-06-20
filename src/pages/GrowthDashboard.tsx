import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchQuests, getMemberActionItems, type ActionItem } from '../lib/repository';
import type { Quest } from '../types/guild';
import { Link } from 'react-router-dom';
import { Award, Compass, TrendingUp, CheckCircle, AlertTriangle, ArrowRight, Star, ShieldAlert, HelpCircle, BookOpen, Users, Target } from 'lucide-react';
import ActionCenter from '../components/ActionCenter';

const RANK_STEPS = ['Applicant', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];

export default function GrowthDashboard() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate action items for member
  const actionItems = useMemo(() => {
    if (!profile) return [];
    return getMemberActionItems(profile, quests);
  }, [profile, quests]);

  // Get critical/high priority items for quick display
  const urgentItems = useMemo(() => {
    return actionItems.filter(i => i.priority === 'critical' || i.priority === 'high');
  }, [actionItems]);

  useEffect(() => {
    async function loadData() {
      try {
        const qList = await fetchQuests();
        setQuests(qList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!profile) return null;

  // Next Rank calculation
  const currentRankIndex = RANK_STEPS.indexOf(profile.guildRank || 'Applicant');
  const nextRank = currentRankIndex < RANK_STEPS.length - 1 ? RANK_STEPS[currentRankIndex + 1] : 'S';
  const pointsToNextRank = Math.max(0, (currentRankIndex + 1) * 100 - profile.reputationScore);
  const rankPercent = Math.min(100, Math.round((profile.reputationScore / ((currentRankIndex + 1) * 100)) * 100));

  // Profile completion score
  let completionScore = 0;
  if (profile.fullName) completionScore += 15;
  if (profile.bio) completionScore += 20;
  if (profile.skills && profile.skills.length > 0) completionScore += 20;
  if (profile.interests && profile.interests.length > 0) completionScore += 15;
  if (profile.phone) completionScore += 15;
  if (profile.photoURL) completionScore += 15;

  // Matching algorithm: Recommended quests based on path and skills
  const recommendedQuests = quests.filter(q => {
    if (q.status !== 'open') return false;
    // Match based on category or skills
    const categoryMatches = q.category?.toLowerCase() === profile.pathSelected?.toLowerCase();
    const skillMatches = q.requiredSkills?.some(s => profile.skills?.includes(s));
    return categoryMatches || skillMatches;
  }).slice(0, 3);

  // Lists
  const appliedQuests = quests.filter(q => q.applicants?.includes(profile.uid));
  const activeQuests = quests.filter(q => q.acceptedMembers?.includes(profile.uid) && q.status === 'inProgress');
  const completedQuests = quests.filter(q => q.completedMembers?.includes(profile.uid) || q.status === 'completed');

  return (
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Top Banner section */}
      <div className="hero-panel bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)] p-8 rounded-2xl flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div>
          <span className="eyebrow block">Personal Growth Core</span>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {profile.fullName}</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-md">
            Your growth path is currently set to <strong className="text-[var(--text)] uppercase tracking-wider">{profile.pathSelected || 'Unassigned'}</strong> in {profile.jurisdiction?.guildBranchName}.
          </p>
        </div>

        {/* Reputation and experience score chips */}
        <div className="flex gap-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center shadow-inner min-w-[100px]">
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-black">Reputation Index</span>
            <strong className="text-2xl font-black text-[var(--primary)] block mt-1">{profile.reputationScore}</strong>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center shadow-inner min-w-[100px]">
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-black">Experience (XP)</span>
            <strong className="text-2xl font-black text-[var(--text)] block mt-1">{profile.experiencePoints}</strong>
          </div>
        </div>

        {/* Action Items Quick View */}
        {actionItems.length > 0 && (
          <div className="mt-4 md:mt-0">
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-black block mb-2">Your Action Items</span>
            <ActionCenter items={actionItems.slice(0, 3)} title="" maxItems={3} />
          </div>
        )}
      </div>

      {/* Row 2: Rank Progress & Profile Completion */}
      <div className="grid md:grid-cols-[1.5fr_1fr] gap-6">
        
        {/* Rank Progression */}
        <div className="panel space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Award size={16} className="text-[var(--primary)]" />
              Rank Progression Check
            </h3>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              Level {profile.guildRank} → {nextRank}
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-[var(--card-subtle)] rounded-full h-3 overflow-hidden border border-[var(--border)] p-0.5">
              <div
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] h-full rounded-full transition-all"
                style={{ width: `${rankPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)]">
              <span>{profile.reputationScore} XP accumulated</span>
              <span>{pointsToNextRank} Rep required for Rank {nextRank}</span>
            </div>
          </div>

          <div className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl p-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
            <strong className="block text-[var(--text)] font-semibold mb-1">Rank Up How:</strong>
            Complete quests to earn reputation. Higher difficulty quests (C, B, A, S) unlock at higher ranks. Submit documented playbooks in the Knowledge Hub to claim rank bonuses.
          </div>
        </div>

        {/* Member Understanding FAQ */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle size={16} className="text-[var(--primary)]" />
            Guild Basics
          </h3>

          <div className="space-y-3">
            <Link to="/impact" className="block p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 transition-all">
              <div className="flex items-start gap-2.5">
                <Target size={14} className="text-[var(--primary)] mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[var(--text)] block">What is Guild?</span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-relaxed">A professional network connecting organizations with verified student and professional contractors for real-world project experience.</span>
                </div>
              </div>
            </Link>

            <Link to="/quests" className="block p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 transition-all">
              <div className="flex items-start gap-2.5">
                <Compass size={14} className="text-[var(--primary)] mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[var(--text)] block">How do quests help me grow?</span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-relaxed">Quests are real projects posted by organizations. Completing them earns reputation points, validates your skills, and builds your portfolio.</span>
                </div>
              </div>
            </Link>

            <Link to="/branches" className="block p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 transition-all">
              <div className="flex items-start gap-2.5">
                <Users size={14} className="text-[var(--primary)] mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[var(--text)] block">Where do I belong?</span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-relaxed">Your local branch ({profile.jurisdiction?.guildBranchName || 'Ludhiana'}) coordinates opportunities, verification, and community events.</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Profile Completion and Warning notifications */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">Profile Scorecard</h3>
          
          <div className="flex items-center justify-between">
            <div className="text-2xl font-black">{completionScore}%</div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Completed</span>
          </div>

          <div className="w-full bg-[var(--card-subtle)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
            <div className="bg-[var(--primary)] h-full" style={{ width: `${completionScore}%` }}></div>
          </div>

          {/* Missing verifications notification */}
          {profile.verificationStatus !== 'verified' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex gap-2.5 items-start text-xs">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-400 font-bold block mb-0.5">Unverified Identity Claim</strong>
                <span className="text-[var(--text-muted)] leading-relaxed">Verify your profile with your local branch receptionist to claim paid contractor opportunities.</span>
                <Link to="/verification" className="block text-[var(--primary)] font-bold mt-1.5 hover:underline flex items-center gap-0.5">
                  Verify profile now <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Quests matching engine */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-black uppercase tracking-wider">Recommended Quests For You</h2>
          <Link to="/quests" className="text-xs text-[var(--primary)] font-bold hover:underline flex items-center gap-1">
            Open Quest Board <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading recommendations...</div>
        ) : recommendedQuests.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {recommendedQuests.map(q => (
              <div key={q.id} className="panel flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
                      {q.difficulty}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold">{q.mode}</span>
                  </div>
                  <h4 className="text-sm font-extrabold line-clamp-1">{q.title}</h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{q.description}</p>
                </div>

                <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center text-xs">
                  <div className="text-[var(--text-secondary)] font-bold">+{q.reputationPoints} Rep</div>
                  <Link to={`/quests/${q.id}`} className="text-[var(--primary)] font-bold hover:underline flex items-center gap-0.5">
                    Details <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)]">
            No dynamic recommendations found. Adjust your skills in settings to trigger matching updates.
          </div>
        )}
      </section>

      {/* Row 4: Active/Applied Quests */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Applied Quests */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">Applied Quests ({appliedQuests.length})</h3>
          {appliedQuests.length > 0 ? (
            <div className="grid gap-2">
              {appliedQuests.map(q => (
                <Link key={q.id} to={`/quests/${q.id}`} className="p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg hover:border-[var(--border-light)] transition-all flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-[var(--text)]">{q.title}</span>
                    <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">Category: {q.category}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[9px] uppercase font-bold border border-amber-500/20">
                    Pending Assign
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">You haven't applied for any quests yet.</p>
          )}
        </div>

        {/* Active Quests */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">Active Quests ({activeQuests.length})</h3>
          {activeQuests.length > 0 ? (
            <div className="grid gap-2">
              {activeQuests.map(q => (
                <Link key={q.id} to={`/quests/${q.id}`} className="p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg hover:border-[var(--border-light)] transition-all flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-[var(--text)]">{q.title}</span>
                    <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">Hours estimate: {q.estimatedHours || 10}h</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] uppercase font-bold border border-emerald-500/20 animate-pulse-slow">
                    In Progress
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">No active assignments. Browse the Quest Board to begin.</p>
          )}
        </div>
      </section>
    </div>
  );
}
