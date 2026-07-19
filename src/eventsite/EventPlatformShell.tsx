import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BadgeCheck, Calendar, HandCoins, History, LayoutDashboard, Megaphone, Ticket } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useEventPlatformSelection } from '../context/EventPlatformSelectionContext';

function EventNavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all md:min-w-0 ${
          isActive
            ? 'bg-[var(--primary)]/20 text-[var(--primary)] ring-1 ring-[var(--primary)]/30'
            : 'text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/50 hover:text-[var(--text)]'
        }`
      }
      end={false}
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export default function EventPlatformShell() {
  const { profile } = useAuth();
  const { selectedEventId, selectedEventStatus } = useEventPlatformSelection();
  const isClosed = selectedEventStatus === 'completed';
  const isOrganizerMode = profile?.role === 'organizationRepresentative' || profile?.role === 'organization';
  const isHostOnlyMode = !isOrganizerMode;
  const shellTitle = isOrganizerMode ? 'Event Management Platform' : 'Host Event Console';
  const shellDescription = isOrganizerMode
    ? 'Shared with your organization workspace for a cleaner event flow.'
    : 'Focused on live event execution, check-in, and certificate delivery.';

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 md:px-6 md:py-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 shadow-sm sm:p-5 md:rounded-3xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight md:text-xl">{shellTitle}</h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{shellDescription}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {selectedEventId ? `Event selected: ${selectedEventId.slice(0, 8)}` : 'Pick an event inside any tool'}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                    selectedEventStatus === 'completed'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      : selectedEventStatus === 'draft'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                        : 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
                  }`}
                >
                  {selectedEventStatus || 'No status yet'}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
              {isOrganizerMode ? (
                <Link
                  className="min-h-10 flex-1 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-2 text-center text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/15 sm:flex-none"
                  to="/org-events"
                >
                  Back to org hub
                </Link>
              ) : (
                <Link
                  className="min-h-10 flex-1 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-2 text-center text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/15 sm:flex-none"
                  to="/event-platform"
                >
                  Host center
                </Link>
              )}
              {isOrganizerMode ? (
                <Link className="min-h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/60 sm:flex-none" to="/event-platform/ticketing">
                  Ticketing
                </Link>
              ) : null}
              <Link className="min-h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/60 sm:flex-none" to="/event-platform/attendance">
                Host check-in
              </Link>
              {isOrganizerMode ? (
                <Link className="min-h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/60 sm:flex-none" to="/event-platform/promotion">
                  Promotion
                </Link>
              ) : null}
              {isOrganizerMode ? (
                <Link className="min-h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-3 py-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/60 sm:flex-none" to="/event-platform/certificates">
                  Certificates
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-2">
              <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-70">
                {isOrganizerMode ? 'Event site' : 'Host tools'}
              </div>
              <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
                {isOrganizerMode ? <EventNavLink to="/event-platform" label="Overview" icon={LayoutDashboard} /> : null}
                {isOrganizerMode ? <EventNavLink to="/event-platform/history" label="History" icon={History} /> : null}
                {!isClosed ? (
                  <>
                    {isOrganizerMode ? <EventNavLink to="/event-platform/ticketing" label="Ticketing" icon={Ticket} /> : null}
                    <EventNavLink to="/event-platform/attendance" label={isHostOnlyMode ? 'Host check-in' : 'Attendance'} icon={BadgeCheck} />
                    {isOrganizerMode ? <EventNavLink to="/event-platform/promotion" label="Promotion" icon={Megaphone} /> : null}
                    {isOrganizerMode ? <EventNavLink to="/event-platform/certificates" label="Certificates" icon={HandCoins} /> : null}
                  </>
                ) : (
                  <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-70">
                    Completed event: tools hidden
                  </div>
                )}
              </nav>

              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-3">
                <div className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {isOrganizerMode
                    ? 'Use this workspace alongside your organization events hub for public pages, ticketing, attendance, promotion, and post-event delivery.'
                    : 'Use this host workspace for arrivals, attendee support, and certificate handoff during the event.'}
                </div>
              </div>
            </aside>

            <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3 sm:p-4 md:p-5">
              <Outlet />
            </section>
          </div>
        </div>

        <div className="mt-4 text-[10px] text-[var(--text-muted)]">Shared event tools for your organization.</div>
      </div>
    </div>
  );
}
