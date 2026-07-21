import React from 'react';
import { CalendarDays, ChevronDown, Eye, MapPin, Users } from 'lucide-react';

import type { EventDocument } from '../lib/eventModels';

function getStatusTone(status?: EventDocument['status']) {
  switch (status) {
    case 'completed':  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
    case 'cancelled':  return 'border-red-500/30 bg-red-500/10 text-red-500';
    case 'draft':      return 'border-amber-500/30 bg-amber-500/10 text-amber-600';
    case 'archived':   return 'border-slate-500/30 bg-slate-500/10 text-slate-400';
    default:           return 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]';
  }
}

type Metric = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

type EventWorkspaceHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  events: Array<EventDocument & { id: string }>;
  selectedEventId: string;
  onSelectEventId: (id: string) => void;
  selectedEvent: (EventDocument & { id: string }) | null;
  metrics?: Metric[];
  aside?: React.ReactNode;
};

export default function EventWorkspaceHeader({
  eyebrow,
  title,
  description,
  events,
  selectedEventId,
  onSelectEventId,
  selectedEvent,
  metrics = [],
  aside,
}: EventWorkspaceHeaderProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-4 shadow-sm sm:p-5">

      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">{eyebrow}</div>
          <h3 className="mt-1.5 text-base font-extrabold tracking-tight sm:text-lg md:text-xl">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm sm:leading-6 line-clamp-2">{description}</p>
        </div>
        {aside ? (
          <div className="w-full shrink-0 sm:w-auto">{aside}</div>
        ) : null}
      </div>

      {/* Bottom grid: event selector + metrics */}
      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">

        {/* Event selector card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 sm:p-4">

          {/* Select + status badges */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <label className="block w-full sm:max-w-xs">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
              <div className="relative mt-1.5">
                <select
                  className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 px-3.5 py-2.5 pr-9 text-sm font-semibold text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 transition"
                  value={selectedEventId}
                  onChange={(e) => onSelectEventId(e.target.value)}
                  disabled={!events.length}
                  aria-label="Selected event"
                >
                  {events.length ? (
                    events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No events available</option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </label>

            {selectedEvent ? (
              <div className="flex flex-wrap gap-1.5">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusTone(selectedEvent.status)}`}>
                  {selectedEvent.status}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {selectedEvent.visibility}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hidden sm:inline-flex">
                  {selectedEvent.ticketTiersEnabled ? 'Ticketing on' : 'Ticketing off'}
                </span>
              </div>
            ) : null}
          </div>

          {/* Event detail cards */}
          {selectedEvent ? (
            <div className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-3 sm:grid-cols-3">
              {[
                {
                  icon: <CalendarDays className="h-3.5 w-3.5" />,
                  label: 'Schedule',
                  value: selectedEvent.startAt
                    ? new Date(selectedEvent.startAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Schedule pending',
                },
                {
                  icon: <MapPin className="h-3.5 w-3.5" />,
                  label: 'Venue',
                  value: selectedEvent.venue || selectedEvent.location || 'Venue TBD',
                },
                {
                  icon: <Eye className="h-3.5 w-3.5" />,
                  label: 'Organizer',
                  value: selectedEvent.organizationName || 'Organization workspace',
                },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-2.5 sm:p-3">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {card.icon}
                    {card.label}
                  </div>
                  <div className="mt-1.5 text-xs font-extrabold truncate sm:text-sm" title={typeof card.value === 'string' ? card.value : undefined}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Metrics */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:w-36">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 sm:p-4">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{metric.label}</span>
                </div>
                <div className="mt-2 text-2xl font-extrabold">{metric.value}</div>
                {metric.hint ? (
                  <div className="mt-0.5 text-[11px] text-[var(--text-secondary)] leading-tight">{metric.hint}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
