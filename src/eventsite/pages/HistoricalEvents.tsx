import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CalendarClock, CircleDollarSign, Ticket, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import EventWorkspaceHeader from '../components/EventWorkspaceHeader';
import { canManageEvent } from '../lib/eventAccess';
import { getEventsForHost, getRegistrationsForEvent } from '../lib/firestoreEvents';
import { isHistoricalEvent, summarizeEventMetrics } from '../lib/eventHistory';
import type { EventDocument, TicketRegistration, TicketTier } from '../lib/eventModels';
import { formatCurrency } from '../lib/pricing';

export default function HistoricalEvents() {
  const { profile, firebaseUser, loading } = useAuth();
  const navigate = useNavigate();
  const ownerUid = profile?.uid || firebaseUser?.uid;

  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  useEffect(() => {
    if (!ownerUid || loading) return;
    const resolvedOwnerUid = ownerUid;
    async function load() {
      setLoadingData(true);
      try {
        const data = await getEventsForHost(resolvedOwnerUid, profile?.uid ? `/member/${profile.uid}` : undefined);
        const manageable = data.filter((event) => canManageEvent(event, profile, resolvedOwnerUid));
        const historical = manageable
          .filter((event) => isHistoricalEvent(event))
          .sort((a, b) => new Date(b.endAt || b.createdAt || 0).getTime() - new Date(a.endAt || a.createdAt || 0).getTime());
        setEvents(historical);
        if (!selectedEventId && historical[0]?.id) {
          setSelectedEventId(historical[0].id);
        }
      } finally {
        setLoadingData(false);
      }
    }

    load();
  }, [ownerUid, loading, profile, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setRegistrations([]);
      return;
    }

    const eventId = selectedEventId;
    async function loadRegistrations() {
      setLoadingRegistrations(true);
      try {
        const data = await getRegistrationsForEvent(eventId);
        setRegistrations(data);
      } finally {
        setLoadingRegistrations(false);
      }
    }

    loadRegistrations();
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const tiers: TicketTier[] = useMemo(() => ((selectedEvent as any)?.ticketTiers || []) as TicketTier[], [selectedEvent]);
  const metrics = useMemo(() => summarizeEventMetrics(selectedEvent, registrations, tiers), [selectedEvent, registrations, tiers]);

  if (loadingData) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 text-sm text-[var(--text-secondary)]">
        Loading your historical events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-subtle)]/20 p-6 text-sm text-[var(--text-secondary)]">
        No completed or past events found yet. Mark an event completed or let it pass its end date to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <EventWorkspaceHeader
        eyebrow="Archive review"
        title="Historical events"
        description="Review past events, compare attendance, and inspect the revenue story for each completed experience."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Tickets sold', value: metrics.sold, hint: `${metrics.capacity} total capacity` },
          { label: 'Payout ready', value: formatCurrency(selectedEvent?.currency, metrics.payoutReady), hint: `${metrics.paidCount} paid bookings archived` },
        ]}
        aside={
          <button
            type="button"
            onClick={() => navigate('/event-platform/maker')}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to maker
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedEventId(event.id || '')}
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${selectedEventId === event.id ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card-subtle)]/20 hover:bg-[var(--card-subtle)]/50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">{event.name}</div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {event.endAt ? new Date(event.endAt).toLocaleString() : 'Date pending'}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                  {event.status}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1">
                  <Users className="h-3 w-3" />
                  {event.status === 'completed' ? 'Completed' : 'Past event'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1">
                  <Ticket className="h-3 w-3" />
                  {event.ticketTiersEnabled ? 'Ticketed' : 'No ticketing'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1">
                  <CircleDollarSign className="h-3 w-3" />
                  Archive ready
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          {!selectedEvent ? (
            <div className="text-sm text-[var(--text-secondary)]">Choose an event to inspect its archive details.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
                <div className="mt-1 text-lg font-extrabold">{selectedEvent.name}</div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">{selectedEvent.description || 'No description available for this archived event.'}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Tickets sold</div>
                  <div className="mt-1 text-xl font-extrabold">{metrics.sold}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Capacity</div>
                  <div className="mt-1 text-xl font-extrabold">{metrics.capacity}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Gross revenue</div>
                  <div className="mt-1 text-xl font-extrabold">{formatCurrency(selectedEvent.currency, metrics.grossRevenue)}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Pending bookings</div>
                  <div className="mt-1 text-xl font-extrabold">{metrics.pendingCount}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
                  Performance snapshot
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Paid bookings</div>
                    <div className="mt-1 text-lg font-extrabold">{metrics.paidCount}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Remaining seats</div>
                    <div className="mt-1 text-lg font-extrabold">{metrics.remaining}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {metrics.tierBreakdown.map((tier) => (
                    <div key={tier.tierId} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{tier.name}</div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-bold text-[var(--primary)]">{Math.round(tier.rate * 100)}%</span>
                          <span>{tier.sold}/{tier.capacity} sold</span>
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[var(--card-subtle)]/60">
                        <div className="h-2 rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${Math.min(100, tier.rate * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  <CalendarClock className="h-4 w-4 text-[var(--primary)]" />
                  Event details
                </div>
                <div className="mt-3 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-[var(--text)]">Started:</span> {selectedEvent.startAt ? new Date(selectedEvent.startAt).toLocaleString() : 'Not set'}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text)]">Ended:</span> {selectedEvent.endAt ? new Date(selectedEvent.endAt).toLocaleString() : 'Not set'}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text)]">Venue:</span> {selectedEvent.venue || 'Not set'}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text)]">Location:</span> {selectedEvent.location || 'Not set'}
                  </div>
                </div>
                <div className="mt-4 text-sm text-[var(--text-secondary)]">
                  <Link to={`/event-platform/e/${selectedEvent.slug}`} className="font-semibold text-[var(--primary)] hover:underline">
                    Open public event page
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loadingRegistrations ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 text-sm text-[var(--text-secondary)]">
          Refreshing archived registrations...
        </div>
      ) : null}
    </div>
  );
}
