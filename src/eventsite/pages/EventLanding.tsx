import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getEventsForOwner } from '../lib/firestoreEvents';
import type { EventDocument } from '../lib/eventModels';

export default function EventLanding() {
  const { firebaseUser, loading, profile } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const ownerUid = profile?.uid || firebaseUser?.uid;

  useEffect(() => {
    async function loadEvents() {
      if (!ownerUid) {
        setEvents([]);
        setEventsLoading(false);
        return;
      }

      setEventsLoading(true);
      try {
        const list = await getEventsForOwner(ownerUid);
        setEvents(list);
      } catch (error) {
        console.error('Failed to load event overview', error);
      } finally {
        setEventsLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid]);

  const publishedCount = events.filter((event) => event.status === 'published').length;
  const draftCount = events.filter((event) => event.status !== 'published').length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h3 className="text-base md:text-lg font-extrabold tracking-tight">Organization event workspace</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Create events, sell tickets, check people in, and issue certificates from one place.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/event-platform/maker"
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black font-bold text-xs hover:opacity-95"
          >
            Create event
          </Link>
          <Link
            to="/event-platform/ticketing"
            className="px-4 py-2 rounded-xl bg-[var(--card-subtle)] text-[var(--text-secondary)] border border-[var(--border)] font-bold text-xs hover:bg-[var(--card-subtle)]/70"
          >
            Open ticketing
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Status</div>
        <div className="mt-2 text-sm font-extrabold">
          {loading ? 'Loading your account…' : firebaseUser ? (eventsLoading ? 'Loading your events…' : `You have ${events.length} event${events.length === 1 ? '' : 's'} in this workspace.`) : 'Sign in to create events.'}
        </div>
        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          Each event creates a public page automatically and the later modules stay tied to that event.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--primary)]/10 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Published</div>
          <div className="text-2xl font-extrabold mt-2">{publishedCount}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">Events visible to attendees.</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Drafts</div>
          <div className="text-2xl font-extrabold mt-2">{draftCount}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">Events being prepared before launch.</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Event tools</div>
          <div className="text-sm font-extrabold mt-2">Ticketing, attendance, promotion, certificates</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">All connected to the event you select from the panel.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          to="/event-platform/maker"
          className="rounded-2xl border border-[var(--border)] bg-[var(--primary)]/10 p-4 hover:bg-[var(--primary)]/20 transition-colors"
        >
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Maker</div>
          <div className="text-sm font-extrabold mt-2">Create and manage events</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">Build ticket tiers, custom questions, and public pages in one step.</div>
        </Link>

        <Link
          to="/event-platform/ticketing"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 hover:bg-[var(--card-subtle)]/50 transition-colors"
        >
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Ticketing</div>
          <div className="text-sm font-extrabold mt-2">Monitor orders and seat availability</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">See live registrations and payment status.</div>
        </Link>

        <Link
          to="/event-platform/attendance"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 hover:bg-[var(--card-subtle)]/50 transition-colors"
        >
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Attendance</div>
          <div className="text-sm font-extrabold mt-2">Track check-ins</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">Mark attendees as checked in from the same event list.</div>
        </Link>

        <Link
          to="/event-platform/certificates"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 hover:bg-[var(--card-subtle)]/50 transition-colors"
        >
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Certificates</div>
          <div className="text-sm font-extrabold mt-2">Issue participation certificates</div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">Use checked-in attendees as the certificate pipeline.</div>
        </Link>
      </div>
    </div>
  );
}


