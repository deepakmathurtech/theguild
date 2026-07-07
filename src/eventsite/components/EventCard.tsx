import React from 'react';

export default function EventCard({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onClick?: () => void;
}) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={
        onClick
          ? 'w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 hover:bg-[var(--card-subtle)]/70 transition-colors p-5 shadow-sm'
          : 'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-5 shadow-sm'
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight">{title}</h3>
            {badge ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-bold">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{subtitle}</p>
        </div>
        {onClick ? (
          <span className="text-xs text-[var(--primary)] font-bold">Open →</span>
        ) : null}
      </div>
    </Comp>
  );
}

