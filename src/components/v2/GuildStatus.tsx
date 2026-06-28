interface GuildStatusProps {
  status: string;
  label?: string;
  className?: string;
  showDot?: boolean;
}

type StatusTone = 'success' | 'active' | 'warning' | 'danger' | 'neutral' | 'info';

const STATUS_TONES: Record<string, StatusTone> = {
  accepted: 'success',
  active: 'active',
  approved: 'success',
  archived: 'neutral',
  assigned: 'active',
  awaitingcompletionreview: 'warning',
  cancelled: 'danger',
  closed: 'neutral',
  completed: 'success',
  convertedtoopportunity: 'info',
  draft: 'warning',
  inprogress: 'active',
  matching: 'active',
  open: 'active',
  paid: 'success',
  partner: 'success',
  pending: 'warning',
  paymentpending: 'warning',
  questcreationinprogress: 'active',
  read: 'neutral',
  rejected: 'danger',
  submitted: 'info',
  underreview: 'warning',
  unread: 'active',
  verified: 'success',
  withdrawn: 'neutral'
};

const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  active: { badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25', dot: 'bg-sky-400' },
  warning: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
  danger: { badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25', dot: 'bg-rose-400' },
  neutral: { badge: 'bg-slate-500/15 text-slate-400 border-slate-500/25', dot: 'bg-slate-400' },
  info: { badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25', dot: 'bg-violet-400' }
};

function normalizeStatus(status: string) {
  return status.replace(/[\s_-]/g, '').toLowerCase();
}

export function formatGuildStatus(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function getGuildStatusTone(status: string): StatusTone {
  return STATUS_TONES[normalizeStatus(status)] || 'neutral';
}

export default function GuildStatus({ status, label, className = '', showDot = false }: GuildStatusProps) {
  const tone = getGuildStatusTone(status);
  const styles = TONE_CLASSES[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles.badge} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {label || formatGuildStatus(status)}
    </span>
  );
}
