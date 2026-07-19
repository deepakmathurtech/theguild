import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Award, CheckCircle2, Loader2, Search } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import EventWorkspaceHeader from '../components/EventWorkspaceHeader';
import { canManageEvent } from '../lib/eventAccess';
import { getAttendanceForEvent, getCertificateIssuesForEvent, getEventsForHost, issueCertificate } from '../lib/firestoreEvents';
import type { AttendanceRecord, CertificateIssue, EventDocument } from '../lib/eventModels';
import { useActionGuard } from '../lib/useActionGuard';

type CertificateType = CertificateIssue['type'];

const certificateOptions: Array<{ label: string; value: CertificateType; hint: string }> = [
  { label: 'Verifiable', value: 'verifiable', hint: 'Trustable verification-ready certificate' },
  { label: 'PDF template', value: 'pdf', hint: 'Quick PDF export for participants' },
  { label: 'Spreadsheet + AutoCAD', value: 'autocad_spreadsheet', hint: 'Legacy export style' },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function CertificateTableSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 md:grid-cols-[1.2fr_1.4fr_0.7fr_0.7fr]">
          <div className="h-4 rounded-full bg-[var(--card-subtle)]" />
          <div className="h-4 rounded-full bg-[var(--card-subtle)]" />
          <div className="h-4 rounded-full bg-[var(--card-subtle)]" />
          <div className="h-8 rounded-xl bg-[var(--card-subtle)]" />
        </div>
      ))}
    </div>
  );
}

export default function Certificates() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateIssue[]>([]);
  const [issuerType, setIssuerType] = useState<CertificateType>('verifiable');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const issueGuard = useActionGuard({ cooldownMs: 1500, maxAttempts: 6, windowMs: 30000 });

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
      setErrorMessage(null);
      try {
        const list = await getEventsForHost(ownerUid, profile?.uid ? `/member/${profile.uid}` : undefined);
        const manageableEvents = list.filter((event) => canManageEvent(event, profile, ownerUid));
        setEvents(manageableEvents);
        if (manageableEvents.length && !selectedEventId) {
          setSelectedEventId(manageableEvents[0].id!);
        }
      } catch (error) {
        console.error('Failed to load events', error);
        setErrorMessage(getErrorMessage(error, 'Unable to load your events right now. Please refresh and try again.'));
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid, profile, selectedEventId]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!selectedEventId) {
        setAttendance([]);
        setCertificates([]);
        return;
      }

      setDataLoading(true);
      setErrorMessage(null);
      try {
        const [attendanceData, certificateData] = await Promise.all([
          getAttendanceForEvent(selectedEventId),
          getCertificateIssuesForEvent(selectedEventId),
        ]);
        if (!cancelled) {
          setAttendance(attendanceData);
          setCertificates(certificateData);
        }
      } catch (error) {
        console.error('Failed to load certificate data', error);
        if (!cancelled) {
          setAttendance([]);
          setCertificates([]);
          setErrorMessage(getErrorMessage(error, 'Unable to load attendee or certificate data for this event.'));
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const isClosed = selectedEvent?.status === 'completed';

  const issuedByRegistrationId = useMemo(() => {
    return new Map(certificates.map((certificate) => [certificate.registrationId, certificate]));
  }, [certificates]);

  const filtered = useMemo(() => attendance.filter((record) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return record.fullName.toLowerCase().includes(q) || record.email.toLowerCase().includes(q);
  }), [attendance, search]);

  const issuedCount = certificates.length;
  const pendingCount = filtered.filter((record) => !issuedByRegistrationId.has(record.registrationId)).length;
  const totalPendingCount = attendance.filter((record) => !issuedByRegistrationId.has(record.registrationId)).length;
  const trimmedSearch = search.trim();

  async function issueForParticipant(record: AttendanceRecord) {
    if (!selectedEventId || issuing) return;
    const guardMessage = issueGuard.guardAction('Certificate issuing is cooling down. Please wait a moment.');
    if (guardMessage) {
      setErrorMessage(guardMessage);
      return;
    }

    if (issuedByRegistrationId.has(record.registrationId)) {
      issueGuard.release();
      setSuccessMessage(`${record.fullName} already has a certificate.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIssuing(record.registrationId);
    try {
      const certificate = await issueCertificate({
        eventId: selectedEventId,
        registrationId: record.registrationId,
        fullName: record.fullName,
        email: record.email,
        type: issuerType,
      });
      setCertificates((previous) => [...previous.filter((item) => item.registrationId !== record.registrationId), certificate]);
      setSuccessMessage(`Certificate issued for ${record.fullName}.`);
    } catch (error) {
      console.error('Failed to issue certificate', error);
      issueGuard.release();
      setErrorMessage(getErrorMessage(error, `Could not issue a certificate for ${record.fullName}. Please try again.`));
    } finally {
      setIssuing(null);
    }
  }

  return (
    <div className="space-y-5">
      <EventWorkspaceHeader
        eyebrow="Post-event delivery"
        title="Certificates"
        description="Issue completion or participation certificates for people who actually showed up, with issuance history stored on the event."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Issued', value: issuedCount, hint: 'Certificates already recorded for this event' },
          { label: 'Pending', value: totalPendingCount, hint: 'Checked-in attendees still waiting' },
        ]}
      />

      <div className="sr-only" role="status" aria-live="polite">
        {successMessage || errorMessage || (dataLoading ? 'Loading certificate data' : '')}
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-500" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-extrabold">Something needs attention</div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{errorMessage}</div>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-600" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-extrabold">Done</div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{successMessage}</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Search</div>
              <div className="mt-2 text-sm font-extrabold">Checked-in attendees</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {filtered.length} shown, {pendingCount} pending in this view
              </div>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-9 py-2 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value.slice(0, 80))}
              onBlur={() => setSearch(trimmedSearch)}
              placeholder="Search by name or email..."
              type="search"
              inputMode="search"
              autoComplete="off"
              aria-label="Search checked-in attendees by name or email"
            />
          </div>

          <div className="mt-4">
            {loading || dataLoading ? (
              <CertificateTableSkeleton />
            ) : filtered.length ? (
              <>
                <div className="space-y-3 md:hidden">
                  {filtered.map((record) => {
                    const issued = issuedByRegistrationId.has(record.registrationId);
                    const isCurrentIssue = issuing === record.registrationId;
                    return (
                      <div key={record.id || record.registrationId} className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold">{record.fullName}</div>
                            <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">{record.email}</div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                            issued
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                              : 'border-[var(--border)] bg-[var(--card-subtle)]/40 text-[var(--text-secondary)]'
                          }`}>
                            {issued ? 'Issued' : 'Pending'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => issueForParticipant(record)}
                          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={Boolean(issuing) || issueGuard.isCoolingDown || issued || !selectedEvent || isClosed}
                          aria-label={`Issue certificate for ${record.fullName}`}
                        >
                          {isCurrentIssue ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {isCurrentIssue ? 'Issuing...' : issueGuard.isCoolingDown ? `Wait ${issueGuard.remainingSeconds}s` : issued ? 'Issued' : 'Issue certificate'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead>
                      <tr className="text-xs text-[var(--text-muted)]">
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((record) => {
                        const issued = issuedByRegistrationId.has(record.registrationId);
                        const isCurrentIssue = issuing === record.registrationId;
                        return (
                          <tr key={record.id || record.registrationId} className="border-t border-[var(--border)]">
                            <td className="py-3 font-semibold">{record.fullName}</td>
                            <td className="py-3 text-[var(--text-secondary)]">{record.email}</td>
                            <td className="py-3">
                              {issued ? <span className="text-xs font-bold text-[var(--success)]">Issued</span> : <span className="text-xs font-bold text-[var(--text-secondary)]">Pending</span>}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => issueForParticipant(record)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={Boolean(issuing) || issueGuard.isCoolingDown || issued || !selectedEvent || isClosed}
                                aria-label={`Issue certificate for ${record.fullName}`}
                              >
                                {isCurrentIssue ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                {isCurrentIssue ? 'Issuing...' : issueGuard.isCoolingDown ? `Wait ${issueGuard.remainingSeconds}s` : issued ? 'Issued' : 'Issue'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
                {trimmedSearch ? 'No checked-in attendees match that search.' : 'No checked-in attendees yet. Mark people as checked in from the attendance tab first.'}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <Award className="h-3.5 w-3.5" />
              Certificate options
            </div>

            <div className="mt-3 space-y-3">
              {certificateOptions.map((option) => (
                <label key={option.value} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 cursor-pointer">
                  <input type="radio" name="certificate-type" checked={issuerType === option.value} onChange={() => setIssuerType(option.value)} className="mt-1" />
                  <div>
                    <div className="text-sm font-extrabold">{option.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{option.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Tracking note</div>
            <div className="mt-2 text-sm font-extrabold">{selectedEvent ? selectedEvent.name : 'No event selected'}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              {isClosed
                ? 'This event is completed, so issuing is locked to preserve the final event record.'
                : 'Certificates are stored under the selected event so your organization can track issuance from the same panel.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
