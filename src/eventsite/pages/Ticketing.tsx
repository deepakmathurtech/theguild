import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEventsForOwner, getRegistrationsForEvent } from '../lib/firestoreEvents';
import type { EventDocument, TicketRegistration, TicketTier } from '../lib/eventModels';

export default function Ticketing() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingRegistrations, setFetchingRegistrations] = useState(false);

  const ownerUid = profile?.uid || firebaseUser?.uid;

  useEffect(() => {
    async function loadEvents() {
      if (!ownerUid) {
        setEvents([]);
        setSelectedEventId('');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const list = await getEventsForOwner(ownerUid);
        setEvents(list);
        if (list.length && !selectedEventId) {
          setSelectedEventId(list[0].id!);
        }
      } catch (error) {
        console.error('Failed to load org events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid]);

  useEffect(() => {
    async function loadRegistrations() {
      if (!selectedEventId) {
        setRegistrations([]);
        return;
      }

      setFetchingRegistrations(true);
      try {
        const data = await getRegistrationsForEvent(selectedEventId);
        setRegistrations(data);
      } catch (error) {
        console.error('Failed to load registrations', error);
      } finally {
        setFetchingRegistrations(false);
      }
    }

    loadRegistrations();
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const tiers: TicketTier[] = useMemo(() => ((selectedEvent as any)?.ticketTiers || []) as TicketTier[], [selectedEvent]);

  const soldCount = registrations.reduce((sum, registration) => sum + Number(registration.qty || 0), 0);
  const capacity = tiers.reduce((sum, tier) => sum + Number(tier.capacity || 0), 0);
  const remainingSeats = Math.max(0, capacity - soldCount);
  const revenue = registrations.reduce((sum, registration) => {
    const tier = tiers.find((item) => item.id === registration.tierId);
    return sum + Number(tier?.price || 0) * Number(registration.qty || 0);
  }, 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base md:text-lg font-extrabold tracking-tight">Ticketing</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Track public purchases, seat usage, and payment status for each event.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block w-full md:max-w-xs">
            <div className="text-xs font-bold text-[var(--text-secondary)]">Event</div>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          {selectedEvent ? (
            <div className="text-xs text-[var(--text-secondary)]">
              {selectedEvent.status === 'published' ? 'Published to public' : 'Draft / not yet published'}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Tickets sold</div>
          <div className="text-2xl font-extrabold mt-2">{soldCount}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Capacity</div>
          <div className="text-2xl font-extrabold mt-2">{capacity}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Revenue</div>
          <div className="text-2xl font-extrabold mt-2">₹{revenue}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Registrations</div>
            <div className="text-sm font-extrabold mt-2">{selectedEvent ? `Live purchases for ${selectedEvent.name}` : 'Select an event to see sales'}</div>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Remaining seats: {remainingSeats}</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading || fetchingRegistrations ? (
            <div className="text-sm text-[var(--text-secondary)]">Loading registrations…</div>
          ) : registrations.length ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)]">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Tier</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => {
                  const tier = tiers.find((item) => item.id === registration.tierId);
                  return (
                    <tr key={registration.id} className="border-t border-[var(--border)]">
                      <td className="py-3 font-semibold">{registration.fullName}</td>
                      <td className="py-3 text-[var(--text-secondary)]">{registration.email}</td>
                      <td className="py-3">{tier?.name || registration.tierId}</td>
                      <td className="py-3">{registration.qty}</td>
                      <td className="py-3 text-[var(--text-secondary)]">
                        <div className="font-semibold text-[var(--primary)]">{registration.paymentStatus || 'pending'}</div>
                        <div className="text-[10px]">{registration.paymentAmount ? `₹${registration.paymentAmount}` : 'No payment captured'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
              No ticket sales yet for this event. Share the public registration page to start collecting buyers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

