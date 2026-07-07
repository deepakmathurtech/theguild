import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAttendanceForEvent, getEventsForOwner, getRegistrationsForEvent, markAttendance } from '../lib/firestoreEvents';
import type { AttendanceRecord, EventDocument, TicketRegistration } from '../lib/eventModels';

export default function AttendanceManager() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

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
        console.error('Failed to load events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid]);

  useEffect(() => {
    async function loadData() {
      if (!selectedEventId) {
        setRegistrations([]);
        setAttendance({});
        return;
      }

      try {
        const [regs, existingAttendance] = await Promise.all([
          getRegistrationsForEvent(selectedEventId),
          getAttendanceForEvent(selectedEventId),
        ]);
        setRegistrations(regs);
        const map: Record<string, AttendanceRecord> = {};
        existingAttendance.forEach((record) => {
          map[record.registrationId] = record;
        });
        setAttendance(map);
      } catch (error) {
        console.error('Failed to load attendance data', error);
      }
    }

    loadData();
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const checkedInCount = Object.values(attendance).filter((record) => record.status === 'checked-in').length;
  const totalCount = registrations.length;

  async function checkIn(registrationId: string, fullName: string, email: string) {
    if (!selectedEventId) return;
    setCheckingIn(registrationId);
    try {
      await markAttendance({
        eventId: selectedEventId,
        registrationId,
        fullName,
        email,
        status: 'checked-in',
      });
      const existingAttendance = await getAttendanceForEvent(selectedEventId);
      const map: Record<string, AttendanceRecord> = {};
      existingAttendance.forEach((record) => {
        map[record.registrationId] = record;
      });
      setAttendance(map);
    } catch (error) {
      console.error('Failed to mark attendance', error);
    } finally {
      setCheckingIn(null);
    }
  }

  const filtered = registrations.filter((registration) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return registration.fullName.toLowerCase().includes(q) || registration.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h3 className="text-base md:text-lg font-extrabold tracking-tight">Attendance manager</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Check in buyers from the same event workspace you use for ticketing.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Checked in</div>
            <div className="text-lg font-extrabold mt-1">{checkedInCount}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Remaining</div>
            <div className="text-lg font-extrabold mt-1">{Math.max(0, totalCount - checkedInCount)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
        <div className="mt-3">
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm md:max-w-xs"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Search</div>
              <div className="text-sm font-extrabold mt-2">Check in by name or email</div>
            </div>
          </div>
          <div className="mt-4">
            <input
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search attendees…"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <div className="text-sm text-[var(--text-secondary)]">Loading attendees…</div>
            ) : filtered.length ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)]">
                    <th className="py-2">Participant</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((registration) => {
                    const checkedIn = Boolean(attendance[registration.id!]);
                    return (
                      <tr key={registration.id} className="border-t border-[var(--border)]">
                        <td className="py-3 font-semibold">{registration.fullName}</td>
                        <td className="py-3 text-[var(--text-secondary)]">{registration.email}</td>
                        <td className="py-3">
                          {checkedIn ? (
                            <span className="text-xs font-bold text-[var(--success)]">Checked In</span>
                          ) : (
                            <span className="text-xs font-bold text-[var(--text-secondary)]">Not Checked In</span>
                          )}
                        </td>
                        <td className="py-3">
                          {checkedIn ? (
                            <button
                              type="button"
                              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 text-xs font-bold text-[var(--text-secondary)]"
                              disabled
                            >
                              Done
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => checkIn(registration.id!, registration.fullName, registration.email)}
                              className="px-3 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-bold hover:opacity-95"
                              disabled={checkingIn === registration.id}
                            >
                              {checkingIn === registration.id ? 'Checking in…' : 'Check In'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
                No attendees for this event yet. Ticket sales will appear here automatically once people buy a ticket.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Certificate readiness</div>
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
            <div className="text-sm font-extrabold">{checkedInCount} attendees ready</div>
            <div className="text-xs text-[var(--text-secondary)] mt-2">
              Checked-in participants are now available for certificate issuing in the next step.
            </div>
            <a
              href="/event-platform/certificates"
              className="mt-4 inline-block w-full text-center rounded-xl bg-[var(--primary)] text-black font-extrabold py-2.5 text-xs hover:opacity-95"
            >
              Issue certificates →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

