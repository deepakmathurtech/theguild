import React from 'react';
import { HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  whyItMatters: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  whyItMatters,
  actionText,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <div className="empty-state animate-fade-up max-w-xl mx-auto py-10 px-8 my-6">
      <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20 mb-3 shadow-inner">
        {icon || <HelpCircle size={22} />}
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      
      <div className="bg-[var(--card)]/60 rounded-xl p-3 border border-[var(--border)] text-xs text-[var(--text-muted)] leading-relaxed max-w-sm mt-1 text-center">
        <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1 text-[9px]">Why this matters</span>
        {whyItMatters}
      </div>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="primary mt-2 px-5 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--primary-dark)]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
