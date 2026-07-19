import React from 'react';
import { CalendarDays, ChevronDown, Eye, MapPin, Users } from 'lucide-react';

import type { EventDocument } from '../lib/eventModels';

function getStatusTone(status?: EventDocument['status']) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
    case 'cancelled':
      return 'border-red-500/30 bg-red-500/10 text-red-500';
    case 'draft':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600';
    case 'archived':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-400';
    default:
      return 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]';
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
    <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">{eyebrow}</div>
          <h3 className="mt-2 text-lg font-extrabold tracking-tight md:text-xl">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {aside ? <div className="w-full shrink-0 lg:w-auto">{aside}</div> : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="block w-full md:max-w-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
              <div className="relative mt-2">
                <select
                  className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg)]/70 px-4 py-3 pr-10 text-sm font-semibold text-[var(--text)]"
                  value={selectedEventId}
                  onChange={(event) => onSelectEventId(event.target.value)}
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
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusTone(selectedEvent.status)}`}>
                  {selectedEvent.status}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {selectedEvent.visibility}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {selectedEvent.ticketTiersEnabled ? 'Ticketing on' : 'Ticketing off'}
                </span>
              </div>
            ) : null}
          </div>

          {selectedEvent ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Schedule
                </div>
                <div className="mt-2 text-sm font-extrabold">{selectedEvent.startAt ? new Date(selectedEvent.startAt).toLocaleString() : 'Schedule pending'}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <MapPin className="h-3.5 w-3.5" />
                  Venue
                </div>
                <div className="mt-2 text-sm font-extrabold">{selectedEvent.venue || selectedEvent.location || 'Venue not added'}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <Eye className="h-3.5 w-3.5" />
                  Organizer
                </div>
                <div className="mt-2 text-sm font-extrabold">{selectedEvent.organizationName || 'Organization workspace'}</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <Users className="h-3.5 w-3.5" />
                {metric.label}
              </div>
              <div className="mt-2 text-xl font-extrabold">{metric.value}</div>
              {metric.hint ? <div className="mt-1 text-xs text-[var(--text-secondary)]">{metric.hint}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
