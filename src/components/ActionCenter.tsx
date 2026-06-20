import { Link } from 'react-router-dom';
import {
  AlertCircle, CheckCircle, Clock, Shield, Target, Users,
  Briefcase, Plus, ArrowRight, AlertTriangle, Zap, FileText, DollarSign, UserCheck
} from 'lucide-react';
import type { ActionItem } from '../lib/repository';

interface Props {
  items: ActionItem[];
  title?: string;
  maxItems?: number;
  showPriority?: boolean;
}

const priorityConfig = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
  high: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'High' },
  medium: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Medium' },
  low: { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Low' }
};

const actionIcons = {
  completeProfile: UserCheck,
  verifyIdentity: Shield,
  applyQuest: Briefcase,
  submitCompletion: FileText,
  addSkill: Zap,
  addPortfolio: FileText,
  reviewSubmission: CheckCircle,
  updateInfo: Users,
  followUp: Clock,
  assignTask: Users,
  paymentAction: DollarSign,
  escalation: AlertTriangle
};

export default function ActionCenter({ items, title = 'Action Items', maxItems = 10, showPriority = true }: Props) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm text-[var(--text-muted)]">No pending actions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
          <span className="text-[10px] font-bold text-[var(--text-muted)]">
            {displayItems.length} pending
          </span>
        </div>
      )}

      <div className="space-y-2">
        {displayItems.map((item) => {
          const priority = priorityConfig[item.priority];
          const ActionIcon = actionIcons[item.type] || AlertCircle;

          return (
            <Link
              key={item.id}
              to={item.link || '#'}
              className={`block p-3 rounded-lg border ${priority.bg} ${priority.border} hover:border-[var(--primary)]/30 transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${priority.bg} border ${priority.border} flex items-center justify-center flex-shrink-0`}>
                  <ActionIcon size={16} className={priority.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text)] truncate">{item.title}</span>
                    {showPriority && (
                      <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{item.description}</p>
                </div>
                <ArrowRight size={14} className="text-[var(--text-muted)] flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {items.length > maxItems && (
        <Link
          to="#"
          className="block text-center text-xs text-[var(--primary)] font-bold hover:underline pt-2"
        >
          View all {items.length} actions
        </Link>
      )}
    </div>
  );
}

// Compact version for dashboard placement
export function ActionCenterPill({ items }: { items: ActionItem[] }) {
  if (items.length === 0) return null;

  const topItem = items[0];
  const priority = priorityConfig[topItem.priority];

  return (
    <Link
      to={topItem.link || '#'}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${priority.bg} ${priority.border} hover:border-[var(--primary)]/50 transition-all`}
    >
      <AlertCircle size={14} className={priority.color} />
      <span className="text-xs font-bold text-[var(--text)]">{topItem.title}</span>
      {items.length > 1 && (
        <span className="text-[9px] text-[var(--text-muted)]">+{items.length - 1} more</span>
      )}
    </Link>
  );
}

// Work Queue Card for role-specific views
export function WorkQueueCard({ items, role }: { items: ActionItem[]; role: string }) {
  const displayItems = items.slice(0, 5);

  return (
    <div className="panel space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Target size={16} className="text-[var(--primary)]" />
          {role} Work Queue
        </h3>
        <span className="text-[10px] font-bold bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded">
          {items.length}
        </span>
      </div>

      {displayItems.length > 0 ? (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const priority = priorityConfig[item.priority];
            const ActionIcon = actionIcons[item.type] || AlertCircle;

            return (
              <Link
                key={item.id}
                to={item.link || '#'}
                className="flex items-center gap-3 p-2.5 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]/30 transition-all"
              >
                <ActionIcon size={14} className={priority.color} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-[var(--text)] block truncate">{item.title}</span>
                  <span className="text-[9px] text-[var(--text-muted)]">{item.description}</span>
                </div>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                  {priority.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <p className="text-xs text-[var(--text-muted)]">Queue clear</p>
        </div>
      )}
    </div>
  );
}