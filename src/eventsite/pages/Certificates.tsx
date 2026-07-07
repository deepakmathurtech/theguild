import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCertificateIssuesForEvent, getEventsForOwner, getAttendanceForEvent, issueCertificate } from '../lib/firestoreEvents';
import type { AttendanceRecord, CertificateIssue, EventDocument } from '../lib/eventModels';

type CertificateType = CertificateIssue['type'];

export default function Certificates() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateIssue[]>([]);
  const [issuerType, setIssuerType] = useState<CertificateType>('verifiable');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);

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
        setAttendance([]);
        setCertificates([]);
        return;
      }

      try {
        const [attendanceData, certificateData] = await Promise.all([
          getAttendanceForEvent(selectedEventId),
          getCertificateIssuesForEvent(selectedEventId),
        ]);
        setAttendance(attendanceData);
        setCertificates(certificateData);
      } catch (error) {
        console.error('Failed to load certificate data', error);
      }
    }

    loadData();
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const filtered = attendance.filter((record) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return record.fullName.toLowerCase().includes(q) || record.email.toLowerCase().includes(q);
  });

  const issuedCount = certificates.length;
  const pendingCount = filtered.filter((record) => !certificates.some((certificate) => certificate.registrationId === record.registrationId)).length;

  async function issueForParticipant(record: AttendanceRecord) {
    if (!selectedEventId) return;
    setIssuing(record.registrationId);
    try {
      const certificate = await issueCertificate({
        eventId: selectedEventId,
        registrationId: record.registrationId,
        fullName: record.fullName,
        email: record.email,
        type: issuerType,
      });
      setCertificates((previous) => [
        ...previous.filter((item) => item.registrationId !== record.registrationId),
        certificate,
      ]);
    } catch (error) {
      console.error('Failed to issue certificate', error);
    } finally {
      setIssuing(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h3 className="text-base md:text-lg font-extrabold tracking-tight">Certificates</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Issue certificates for checked-in attendees from the selected event.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Issued</div>
            <div className="text-lg font-extrabold mt-1">{issuedCount}</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Pending</div>
            <div className="text-lg font-extrabold mt-1">{pendingCount}</div>
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

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Search</div>
              <div className="text-sm font-extrabold mt-2">Checked-in attendees</div>
            </div>
          </div>

          <div className="mt-3">
            <input
              className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name/email…"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <div className="text-sm text-[var(--text-secondary)]">Loading attendees…</div>
            ) : filtered.length ? (
              <table className="w-full text-left text-sm">
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
                    const issued = certificates.some((certificate) => certificate.registrationId === record.registrationId);
                    return (
                      <tr key={record.id} className="border-t border-[var(--border)]">
                        <td className="py-3 font-semibold">{record.fullName}</td>
                        <td className="py-3 text-[var(--text-secondary)]">{record.email}</td>
                        <td className="py-3">
                          {issued ? <span className="text-xs font-bold text-[var(--success)]">Issued</span> : <span className="text-xs font-bold text-[var(--text-secondary)]">Pending</span>}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => issueForParticipant(record)}
                            className="px-3 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-bold hover:opacity-95"
                            disabled={issuing === record.registrationId || !selectedEvent}
                          >
                            {issuing === record.registrationId ? 'Issuing…' : issued ? 'Issued' : 'Issue'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
                No checked-in attendees yet. Mark people as checked in from the attendance tab first.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Certificate options</div>

          <div className="mt-3 space-y-3">
            {[
              { label: 'Verifiable', value: 'verifiable' as const },
              { label: 'PDF template', value: 'pdf' as const },
              { label: 'Spreadsheet + AutoCAD', value: 'autocad_spreadsheet' as const },
            ].map((option) => (
              <label key={option.value} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 cursor-pointer">
                <input type="radio" checked={issuerType === option.value} onChange={() => setIssuerType(option.value)} className="mt-1" />
                <div>
                  <div className="text-sm font-extrabold">{option.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{option.value === 'verifiable' ? 'Trustable verification-ready certificate' : option.value === 'pdf' ? 'Quick PDF export for participants' : 'Legacy export style'}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 text-[10px] text-[var(--text-muted)] leading-relaxed">
            Certificates are stored under the selected event so your organization can track issuance from the same panel.
          </div>
        </div>
      </div>
    </div>
  );
}

