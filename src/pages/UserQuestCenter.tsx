import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserQuestApplications, getUserQuestStats, withdrawApplication, type UserQuestStats } from '../lib/repository';
import type { QuestApplication } from '../types/guild';
import { useNavigate } from 'react-router-dom';
import { Compass, Clock, CheckCircle, XCircle, Award, Users, Target, Calendar, ExternalLink, FolderOpen, GitBranch, Wallet, FileText, Loader, ChevronRight, Send, Clock3, Flag, Pause, Play, Archive } from 'lucide-react';
import EmptyState from '../components/EmptyState';

interface ApplicationWithQuest extends QuestApplication {
  questId: string;
  questType: 'standard' | 'openSource';
}

// Status configuration
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  submitted: { label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Clock },
  underReview: { label: 'Under Review', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Clock3 },
  accepted: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: Play },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Pause },
  completed: { label: 'Completed', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Flag }
};

export default function UserQuestCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<QuestApplication[]>([]);
  const [stats, setStats] = useState<UserQuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [filter, setFilter] = useState<string>('all');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      try {
        const [apps, userStats] = await Promise.all([
          getUserQuestApplications(profile.uid),
          getUserQuestStats(profile.uid)
        ]);
        setApplications(apps);
        setStats(userStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  const handleWithdraw = async (appId: string) => {
    if (!profile || !confirm('Are you sure you want to withdraw this application?')) return;
    setWithdrawing(appId);
    try {
      await withdrawApplication(appId, profile.uid);
      // Refresh data
      const apps = await getUserQuestApplications(profile.uid);
      setApplications(apps);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setWithdrawing(null);
    }
  };

  // Filter applications by status
  const activeApps = applications.filter(a =>
    a.status === 'submitted' || a.status === 'underReview'
  );
  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const historyApps = applications.filter(a =>
    a.status === 'rejected' || a.status === 'withdrawn' || a.status === 'completed'
  );

  // Filter by type
  const filteredActive = filter === 'all'
    ? activeApps
    : filter === 'standard'
    ? activeApps.filter(a => a.questType !== 'openSource')
    : activeApps.filter(a => a.questType === 'openSource');

  const filteredHistory = filter === 'all'
    ? historyApps
    : filter === 'standard'
    ? historyApps.filter(a => a.questType !== 'openSource')
    : historyApps.filter(a => a.questType === 'openSource');

  const filteredAccepted = filter === 'all'
    ? acceptedApps
    : filter === 'standard'
    ? acceptedApps.filter(a => a.questType !== 'openSource')
    : acceptedApps.filter(a => a.questType === 'openSource');

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
        <Loader className="animate-spin inline mr-2" />Loading your quest center...
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Quest Center</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Manage all your quest applications and participation history.
        </p>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="panel text-center">
            <div className="text-xl font-black text-[var(--primary)]">{stats.totalApplications}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Total Applications</div>
          </div>
          <div className="panel text-center">
            <div className="text-xl font-black text-amber-400">{stats.pending}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Pending</div>
          </div>
          <div className="panel text-center">
            <div className="text-xl font-black text-emerald-400">{stats.accepted}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Active</div>
          </div>
          <div className="panel text-center">
            <div className="text-xl font-black text-purple-400">{stats.completed}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Completed</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {(['active', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === tab
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab === 'active' ? 'Active Quests' : 'Quest History'}
            {tab === 'active' && activeApps.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--primary)]/20 text-[10px]">
                {activeApps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'standard', 'openSource'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
              filter === f
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--card-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {f === 'all' ? 'All Types' : f === 'standard' ? 'Standard' : 'Open Source'}
          </button>
        ))}
      </div>

      {/* Active Tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* Pending Applications */}
          {filteredActive.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3">
                <Clock size={14} /> Pending Applications
              </h2>
              <div className="grid gap-3">
                {filteredActive.map(app => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onWithdraw={() => handleWithdraw(app.id)}
                    withdrawing={withdrawing === app.id}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accepted Quests */}
          {filteredAccepted.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                <Play size={14} /> Active Assignments
              </h2>
              <div className="grid gap-3">
                {filteredAccepted.map(app => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    navigate={navigate}
                    showWorkspace
                  />
                ))}
              </div>
            </div>
          )}

          {filteredActive.length === 0 && filteredAccepted.length === 0 && (
            <EmptyState
              title="No Active Quests"
              description="You don't have any pending or active quest applications."
              whyItMatters="Apply for quests to gain experience and reputation."
              actionText="Browse Quests"
              onAction={() => navigate('/quests')}
              icon={<Compass size={22} />}
            />
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Rejected */}
          {filteredHistory.filter(a => a.status === 'rejected').length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-3">
                <XCircle size={14} /> Rejected Applications
              </h2>
              <div className="grid gap-3">
                {filteredHistory
                  .filter(a => a.status === 'rejected')
                  .map(app => (
                    <HistoryCard key={app.id} application={app} />
                  ))}
              </div>
            </div>
          )}

          {/* Withdrawn */}
          {filteredHistory.filter(a => a.status === 'withdrawn').length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-3">
                <Pause size={14} /> Withdrawn
              </h2>
              <div className="grid gap-3">
                {filteredHistory
                  .filter(a => a.status === 'withdrawn')
                  .map(app => (
                    <HistoryCard key={app.id} application={app} />
                  ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {filteredHistory.filter(a => a.status === 'completed').length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-purple-400 flex items-center gap-2 mb-3">
                <Flag size={14} /> Completed Quests
              </h2>
              <div className="grid gap-3">
                {filteredHistory
                  .filter(a => a.status === 'completed')
                  .map(app => (
                    <HistoryCard key={app.id} application={app} />
                  ))}
              </div>
            </div>
          )}

          {filteredHistory.length === 0 && (
            <EmptyState
              title="No Quest History"
              description="You haven't completed any quests yet."
              whyItMatters="Completing quests builds your reputation and contribution history."
              actionText="Browse Quests"
              onAction={() => navigate('/quests')}
              icon={<Archive size={22} />}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Application Card Component
function ApplicationCard({
  application,
  onWithdraw,
  withdrawing,
  navigate,
  showWorkspace
}: {
  application: QuestApplication;
  onWithdraw?: () => void;
  withdrawing?: boolean;
  navigate: (path: string) => void;
  showWorkspace?: boolean;
}) {
  const config = statusConfig[application.status] || statusConfig.submitted;
  const StatusIcon = config.icon;

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
            {application.questType === 'openSource' ? (
              <GitBranch size={18} className={config.color} />
            ) : (
              <Target size={18} className={config.color} />
            )}
          </div>
          <div>
            <div className="font-bold text-sm">{application.questTitle || 'Unknown Quest'}</div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2 mt-1">
              <span>{application.questType === 'openSource' ? 'Open Source' : 'Standard'}</span>
              {application.roleTitle && (
                <span className="text-purple-400">• {application.roleTitle}</span>
              )}
              <span>• {new Date(application.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
        {showWorkspace && (
          <button
            onClick={() => navigate(`/quests/${application.questId}`)}
            className="flex-1 py-2 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <ExternalLink size={12} /> Open Workspace
          </button>
        )}
        {application.status === 'submitted' && onWithdraw && (
          <button
            onClick={onWithdraw}
            disabled={withdrawing}
            className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {withdrawing ? <Loader className="animate-spin" size={12} /> : <Pause size={12} />}
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

// History Card Component
function HistoryCard({ application }: { application: QuestApplication }) {
  const config = statusConfig[application.status] || statusConfig.submitted;
  const StatusIcon = config.icon;

  return (
    <div className="panel p-4 opacity-70">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
            {application.questType === 'openSource' ? (
              <GitBranch size={18} className={config.color} />
            ) : (
              <Target size={18} className={config.color} />
            )}
          </div>
          <div>
            <div className="font-bold text-sm">{application.questTitle || 'Unknown Quest'}</div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2 mt-1">
              <span>{application.questType === 'openSource' ? 'Open Source' : 'Standard'}</span>
              <span>• {new Date(application.createdAt).toLocaleDateString()}</span>
              {application.reviewedAt && (
                <span>• Reviewed {new Date(application.reviewedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {application.reviewerNotes && (
        <div className="mt-2 text-xs text-[var(--text-muted)]">{application.reviewerNotes}</div>
      )}
    </div>
  );
}