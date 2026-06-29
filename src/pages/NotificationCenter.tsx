import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, archiveNotification, dismissNotification } from '../lib/repository';
import type { NotificationRecord } from '../types/guild';
import { useNavigate } from 'react-router-dom';
import { Bell, Mail, Check, CheckCheck, Archive, Trash2, ArrowRight, AlertTriangle, Award, FileCheck, DollarSign, Compass, Building, Zap } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { PAGE_SEO } from '../components/SEO';

// Map notification types to icons
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'quest_assigned':
    case 'quest_accepted':
      return <Compass size={16} className="text-blue-400" />;
    case 'quest_overdue':
      return <AlertTriangle size={16} className="text-red-400" />;
    case 'submission_verified':
      return <FileCheck size={16} className="text-emerald-400" />;
    case 'submission_rejected':
      return <FileCheck size={16} className="text-red-400" />;
    case 'rank_promotion':
      return <Award size={16} className="text-amber-400" />;
    case 'revenue_recorded':
    case 'revenue_paid':
      return <DollarSign size={16} className="text-emerald-400" />;
    case 'organization_assigned':
    case 'organization_created':
      return <Building size={16} className="text-purple-400" />;
    case 'escalation_received':
    case 'application_submitted':
      return <Zap size={16} className="text-amber-400" />;
    default:
      return <Bell size={16} className="text-[var(--text-muted)]" />;
  }
};

// Get priority color
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'border-l-red-500 bg-red-500/5';
    case 'high': return 'border-l-amber-500 bg-amber-500/5';
    case 'medium': return 'border-l-blue-500 bg-blue-500/5';
    default: return 'border-l-[var(--border)] bg-[var(--card-subtle)]';
  }
};

const getNotificationError = (action: string) =>
  `We couldn't ${action}. Please check your connection and try again.`;

function getSafeActionPath(actionUrl?: string) {
  if (!actionUrl || !actionUrl.startsWith('/') || actionUrl.startsWith('//')) return '';
  return actionUrl;
}

export default function NotificationCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');

  // SEO: Set page title
  useEffect(() => {
    document.title = PAGE_SEO.notifications.title;
  }, []);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    async function loadNotifications() {
      if (!profile?.uid) return;
      try {
        const list = await fetchUserNotifications(profile.uid);
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError("We couldn't load your notifications. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, [profile?.uid]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread';
    if (filter === 'read') return n.status === 'read';
    return true;
  });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const handleMarkAsRead = async (id: string) => {
    if (!profile?.uid) return;
    try {
      setError('');
      setWorkingId(id);
      await markNotificationAsRead(id, profile.uid);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read', read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
      setError(getNotificationError('mark that notification as read'));
    } finally {
      setWorkingId('');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.uid) return;
    try {
      setError('');
      setWorkingId('all');
      await markAllNotificationsAsRead(profile.uid);
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read', read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError(getNotificationError('mark your notifications as read'));
    } finally {
      setWorkingId('');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      setError('');
      setWorkingId(id);
      await dismissNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to dismiss:', err);
      setError(getNotificationError('dismiss that notification'));
    } finally {
      setWorkingId('');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      setError('');
      setWorkingId(id);
      await archiveNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to archive:', err);
      setError(getNotificationError('archive that notification'));
    } finally {
      setWorkingId('');
    }
  };

  const handleNotificationClick = (notification: NotificationRecord) => {
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.id);
    }
    const actionPath = getSafeActionPath(notification.actionUrl);
    if (actionPath) {
      navigate(actionPath);
    }
  };

  return (
    <div className="space-y-6 py-4 text-left max-w-3xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Bell size={24} className="text-[var(--primary)]" />
            Notification Center
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={workingId === 'all'}
            className="ghost flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
          >
            <CheckCheck size={14} />
            <span>{workingId === 'all' ? 'Updating...' : 'Mark All Read'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-500 font-semibold flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unreadCount})` : 'Read'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading notifications...</div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-2">
          {filteredNotifications.map(notification => (
            (() => {
              const actionPath = getSafeActionPath(notification.actionUrl);
              const isWorking = workingId === notification.id;
              return (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`panel p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:bg-[var(--card-subtle)] ${
                notification.status === 'unread' ? getPriorityColor(notification.priority) : 'border-l-[var(--border)]'
              }`}
            >
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {notification.status === 'unread' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-[var(--primary)] mr-1.5 align-middle" />
                      )}
                      <strong className={`text-sm font-semibold ${notification.status === 'unread' ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                        {notification.title}
                      </strong>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{notification.body}</p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-2">
                    {actionPath && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(actionPath); }}
                        className="text-[10px] text-[var(--primary)] font-bold flex items-center gap-0.5 hover:underline"
                      >
                        View <ArrowRight size={10} />
                      </button>
                    )}
                    {notification.status === 'unread' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                        disabled={isWorking}
                        className="text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-0.5 disabled:opacity-50"
                      >
                        <Check size={10} /> {isWorking ? 'Updating' : 'Mark Read'}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(notification.id); }}
                      disabled={isWorking}
                      className="text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-0.5 disabled:opacity-50"
                    >
                      <Trash2 size={10} /> Dismiss
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(notification.id); }}
                      disabled={isWorking}
                      className="text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-0.5 disabled:opacity-50"
                    >
                      <Archive size={10} /> Archive
                    </button>
                  </div>
                </div>
              </div>
            </div>
              );
            })()
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Notifications"
          description={filter === 'unread' ? "You have no unread notifications." : filter === 'read' ? "You have no read notifications." : "You have no notifications yet."}
          whyItMatters="Notifications keep you updated on quest assignments, submission reviews, rank promotions, and more."
          actionText="Browse Quests"
          onAction={() => navigate('/quests')}
          icon={<Bell size={22} />}
        />
      )}
    </div>
  );
}
