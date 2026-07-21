import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CalendarDays, ShieldCheck, Ticket, Users } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { canManageEvent } from '../lib/eventAccess';
import { getEventsForHost } from '../lib/firestoreEvents';
import type { EventDocument } from '../lib/eventModels';

export default function EventLanding() {
  const { firebaseUser, loading, profile } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownerUid = profile?.uid || firebaseUser?.uid;

  useEffect(() => {
    async function loadEvents() {
      if (!ownerUid) {
        setEvents([]);
        setEventsLoading(false);
        return;
      }

      setEventsLoading(true);
      setErrorMessage(null);
      try {
        const list = await getEventsForHost(ownerUid, profile?.uid ? `/member/${profile.uid}` : undefined);
        const manageableEvents = list.filter((event) => canManageEvent(event, profile, ownerUid));
        const activeEvents = manageableEvents.filter((event) => event.status !== 'completed');
        setEvents(activeEvents);
      } catch (error) {
        console.error('Failed to load event overview', error);
        setErrorMessage('Unable to load your event overview right now.');
      } finally {
        setEventsLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid, profile]);

  const publishedCount = events.filter((event) => event.status === 'published').length;
  const draftCount = events.filter((event) => event.status !== 'published' && event.status !== 'completed').length;
  const isOrganizerMode = profile?.role === 'organizationRepresentative' || profile?.role === 'organization';
  const roleLabel = isOrganizerMode ? 'Organizer workspace' : 'Host workspace';
  const nextEvent = useMemo(
    () =>
      [...events]
        .filter((event) => event.startAt)
        .sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime())[0] || events[0] || null,
    [events]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-extrabold tracking-tight md:text-lg">Event workspace</h3>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {isOrganizerMode
              ? 'Create events, sell tickets, guide hosts, check people in, and issue certificates from one connected flow.'
              : 'Open your assigned events, move attendees through check-in, and keep certificate handoff ready during the live event.'}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
          {isOrganizerMode ? (
            <>
              <Link to="/event-platform/maker" className="min-h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-xs font-bold text-black hover:opacity-95 sm:flex-none">
                Create event
              </Link>
              <Link
                to="/event-platform/ticketing"
                className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-4 py-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 sm:flex-none"
              >
                Open operations
              </Link>
            </>
          ) : (
            <>
              <Link to="/event-platform/attendance" className="min-h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-xs font-bold text-black hover:opacity-95 sm:flex-none">
                Start check-in
              </Link>
              <Link
                to="/event-platform/certificates"
                className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] px-4 py-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 sm:flex-none"
              >
                Certificate desk
              </Link>
            </>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">{roleLabel}</div>
            <div className="mt-2 text-lg font-extrabold">
              {loading ? 'Loading your account...' : firebaseUser ? (eventsLoading ? 'Loading your events...' : `You have ${events.length} active event${events.length === 1 ? '' : 's'} in this workspace.`) : 'Sign in to create or manage events.'}
            </div>
            <div className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Each event creates a public page automatically, then keeps ticketing, attendance, promotion, and post-event delivery tied to that same record.
            </div>
          </div>

          {nextEvent ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/35 p-4 lg:max-w-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Next focus event</div>
              <div className="mt-2 text-sm font-extrabold">{nextEvent.name}</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {nextEvent.startAt ? new Date(nextEvent.startAt).toLocaleString() : 'Schedule pending'}
              </div>
            </div>
          ) : null}
        </div>

        {eventsLoading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                <div className="h-3 w-24 rounded-full bg-[var(--card-subtle)]" />
                <div className="mt-3 h-7 w-12 rounded-full bg-[var(--card-subtle)]" />
                <div className="mt-3 h-3 w-full rounded-full bg-[var(--card-subtle)]" />
              </div>
            ))}
          </div>
        ) : null}

        <div className={`${eventsLoading ? 'sr-only' : 'mt-5'} grid grid-cols-1 gap-3 md:grid-cols-3`}>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--primary)]/10 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Published</div>
            <div className="mt-2 text-2xl font-extrabold">{publishedCount}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Events currently visible to attendees.</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Drafts</div>
            <div className="mt-2 text-2xl font-extrabold">{draftCount}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Experiences being prepared before launch.</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Total events</div>
            <div className="mt-2 text-2xl font-extrabold">{events.length}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              Active events in this workspace ({isOrganizerMode ? 'organizer view' : 'host view'}).
            </div>
          </div>
        </div>
      </div>

      {isOrganizerMode ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <CalendarDays className="h-3.5 w-3.5" />
              Organizer flow
            </div>
            <div className="mt-2 text-sm font-extrabold">Create, publish, price, and review the event.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Use maker, ticketing, promotion, and history to manage the full lifecycle.</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Host flow
            </div>
            <div className="mt-2 text-sm font-extrabold">Open attendance, scan profiles, and move arrivals through the door.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Hosts can work from the same event tools without needing organizer ownership.</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <Ticket className="h-3.5 w-3.5" />
              Attendee flow
            </div>
            <div className="mt-2 text-sm font-extrabold">Share the public event page so people can register and pay.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Attendees sign in, choose tickets, submit answers, and appear in the host tools instantly.</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--primary)]/10 p-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Door flow
            </div>
            <div className="mt-2 text-sm font-extrabold">Open attendance and clear the arrival queue fast.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Use search or profile QR links to check people in with less friction.</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <Users className="h-3.5 w-3.5" />
              Team flow
            </div>
            <div className="mt-2 text-sm font-extrabold">Add other hosts and keep everyone on the same event.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">The host list and selected event stay connected inside the same workspace.</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Handoff flow
            </div>
            <div className="mt-2 text-sm font-extrabold">Prepare certificates once attendees are checked in.</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Move directly from attendance into certificate issuing without leaving the host flow.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(isOrganizerMode
          ? [
              {
                to: '/event-platform/maker',
                label: 'Maker',
                title: 'Create and manage events',
                body: 'Build ticket tiers, custom questions, and public pages in one step.',
              },
              {
                to: '/event-platform/history',
                label: 'History',
                title: 'Review old events with insights',
                body: 'Open archived events and inspect their sales, payout, and attendance story.',
              },
              {
                to: '/event-platform/ticketing',
                label: 'Ticketing',
                title: 'Monitor orders and seat availability',
                body: 'See live registrations, payment status, and payout readiness.',
              },
              {
                to: '/event-platform/attendance',
                label: 'Attendance',
                title: 'Track check-ins',
                body: 'Mark attendees as checked in and prepare certificates from the same event record.',
              },
              {
                to: '/event-platform/certificates',
                label: 'Certificates',
                title: 'Issue participation certificates',
                body: 'Use checked-in attendees as the certificate pipeline.',
              },
              {
                to: '/org-events',
                label: 'Org hub',
                title: 'Return to the event hub',
                body: 'Review your event list, public pages, and quick actions from one screen.',
              },
            ]
          : [
              {
                to: '/event-platform/attendance',
                label: 'Check-in',
                title: 'Open the live arrival queue',
                body: 'Search attendees, scan profile links, and update arrivals from one host screen.',
              },
              {
                to: '/event-platform/certificates',
                label: 'Certificates',
                title: 'Issue certificates after attendance is confirmed',
                body: 'Checked-in attendees flow directly into certificate issuing.',
              },
              {
                to: '/event-platform/ticketing',
                label: 'Registrations',
                title: 'Review current registrations',
                body: 'See who is coming and the payment state behind each booking before doors open.',
              },
              {
                to: nextEvent ? `/event-platform/e/${nextEvent.slug}` : '/event-platform',
                label: 'Public page',
                title: 'Open the attendee-facing event page',
                body: 'Use the live event page when you need to confirm what attendees are seeing.',
              },
            ]).map((item) => (
          <Link key={item.to} to={item.to} className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 transition-colors hover:bg-[var(--card-subtle)]/50">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{item.label}</div>
            <div className="mt-2 text-sm font-extrabold">{item.title}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">{item.body}</div>
            <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Working roles
        </div>
        <div className="mt-2 text-sm font-extrabold">Organizer, host, and attendee journeys are all supported from this event system.</div>
        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          Organizers manage setup and money, hosts manage arrivals, and attendees use the public page plus sign-in flow to register.
        </div>
      </div>
    </div>
  );
}
