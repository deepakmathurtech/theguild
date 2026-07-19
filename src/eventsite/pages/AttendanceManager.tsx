import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, QrCode, Search } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useEventPlatformSelection } from '../../context/EventPlatformSelectionContext';
import EventWorkspaceHeader from '../components/EventWorkspaceHeader';
import { extractProfileUrlFromScanValue, normalizePublicProfileUrl } from '../lib/attendanceUtils';
import { getAttendanceForEvent, getEventHosts, getEventsForHost, getRegistrationsForEvent, markAttendance, setEventHosts } from '../lib/firestoreEvents';
import type { AttendanceRecord, EventDocument, EventHostAssignment, TicketRegistration } from '../lib/eventModels';
import { useActionGuard } from '../lib/useActionGuard';

export default function AttendanceManager() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [hosts, setHosts] = useState<EventHostAssignment[]>([]);
  const [hostInput, setHostInput] = useState('');
  const [hostMessage, setHostMessage] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'waiting' | 'checked-in' | 'all'>('waiting');
  const [cameraMode, setCameraMode] = useState<'idle' | 'starting' | 'live'>('idle');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(false);
  const checkInGuard = useActionGuard({ cooldownMs: 800, maxAttempts: 8, windowMs: 10000 });
  const hostGuard = useActionGuard({ cooldownMs: 30000, maxAttempts: 2, windowMs: 60000 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const scanLockRef = useRef(false);

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
        const list = await getEventsForHost(ownerUid, profile?.uid ? `/member/${profile.uid}` : undefined);
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
  }, [ownerUid, profile?.uid, selectedEventId]);

  useEffect(() => {
    async function loadData() {
      if (!selectedEventId) {
        setRegistrations([]);
        setAttendance({});
        return;
      }

      try {
        const [regs, existingAttendance, currentHosts] = await Promise.all([
          getRegistrationsForEvent(selectedEventId),
          getAttendanceForEvent(selectedEventId),
          getEventHosts(selectedEventId),
        ]);
        setRegistrations(regs);
        setHosts(currentHosts);
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
  const isClosed = selectedEvent?.status === 'completed';
  const selectedEventIndex = selectedEvent ? events.findIndex((event) => event.id === selectedEvent.id) : -1;
  const canGoToPreviousEvent = selectedEventIndex > 0;
  const canGoToNextEvent = selectedEventIndex >= 0 && selectedEventIndex < events.length - 1;

  const { setSelectedEventId: publishSelectedEventId, setSelectedEventStatus } = useEventPlatformSelection();

  useEffect(() => {
    if (!selectedEvent) return;
    publishSelectedEventId(selectedEvent.id || '');
    setSelectedEventStatus(selectedEvent.status);
  }, [selectedEvent, publishSelectedEventId, setSelectedEventStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: any }).BarcodeDetector;
    const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    const hasDetector = Boolean(BarcodeDetectorCtor);

    setCameraSupported(hasMediaDevices && hasDetector);

    if (hasDetector) {
      detectorRef.current = new BarcodeDetectorCtor({ formats: ['qr_code'] });
    }

    return () => {
      if (scanFrameRef.current) {
        window.cancelAnimationFrame(scanFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const checkedInCount = Object.values(attendance).filter((record) => record.status === 'checked-in').length;
  const totalCount = registrations.length;

  async function checkIn(registrationId: string, fullName: string, email: string) {
    if (!selectedEventId) return;
    if (checkingIn) return;
    const guardMessage = checkInGuard.guardAction('Check-in is moving too fast. Wait a moment and try again.');
    if (guardMessage) {
      setScanResult(guardMessage);
      return;
    }

    setCheckingIn(registrationId);
    try {
      await markAttendance({
        eventId: selectedEventId,
        registrationId,
        fullName,
        email,
        status: 'checked-in',
        checkedInBy: profile?.uid || firebaseUser?.uid,
        checkedInByName: profile?.fullName || firebaseUser?.displayName || 'Host',
      });
      const existingAttendance = await getAttendanceForEvent(selectedEventId);
      const map: Record<string, AttendanceRecord> = {};
      existingAttendance.forEach((record) => {
        map[record.registrationId] = record;
      });
      setAttendance(map);
    } catch (error) {
      console.error('Failed to mark attendance', error);
      checkInGuard.release();
      setScanResult('Unable to check in this attendee right now. Please try again.');
    } finally {
      setCheckingIn(null);
    }
  }

  async function addHost() {
    if (!selectedEventId) return;
    const guardMessage = hostGuard.guardAction(`Host updates are cooling down. Try again in ${Math.max(1, hostGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setHostMessage(guardMessage);
      return;
    }

    const trimmed = hostInput.trim();
    const normalized = normalizePublicProfileUrl(trimmed);
    if (!normalized) {
      hostGuard.release();
      setHostMessage('Add a public profile URL like /member/<userId> or /g/<guildId>.');
      return;
    }

    const memberMatch = normalized.match(/^\/member\/([^/]+)$/);
    const inferredUserId = memberMatch?.[1] || (profile?.uid && normalized === `/member/${profile.uid}` ? profile.uid : undefined);
    const isCurrentUser = Boolean(profile?.uid && inferredUserId === profile.uid);

    const entry: EventHostAssignment = {
      userId: inferredUserId || normalized,
      displayName: isCurrentUser ? profile?.fullName || 'You' : normalized,
      publicProfileUrl: normalized,
      role: 'host',
      grantedAt: new Date().toISOString(),
      grantedBy: profile?.uid || firebaseUser?.uid,
    };

    const nextHosts = [...hosts.filter((host) => normalizePublicProfileUrl(host.publicProfileUrl) !== normalized && host.userId !== inferredUserId), entry];
    setHosts(nextHosts);
    try {
      await setEventHosts(selectedEventId, nextHosts);
      setHostInput('');
      setHostMessage(isCurrentUser ? 'You can now access Host Check-in for this event from the sidebar.' : 'Host access added for this event.');
    } catch (error) {
      console.error('Failed to add event host', error);
      hostGuard.release();
      setHostMessage('Unable to add this host right now. Please try again.');
    }
  }

  async function processScanValue(rawValue: string) {
    if (!selectedEventId) return false;

    const normalized = extractProfileUrlFromScanValue(rawValue);
    if (!normalized) {
      setScanResult('Scan or paste a valid profile link like /member/user-123 or /g/guild-456.');
      return false;
    }

    const matched = registrations.find((registration) => normalizePublicProfileUrl(registration.profileUrl) === normalized);
    if (!matched) {
      setScanResult('No attendee matched that public profile URL yet.');
      return false;
    }

    await checkIn(matched.id!, matched.fullName, matched.email);
    setScanResult(`Checked in ${matched.fullName}.`);
    setScanValue('');
    return true;
  }

  async function handleScan() {
    const trimmed = scanValue.trim();
    if (trimmed) {
      await processScanValue(trimmed);
      return;
    }

    // No text to parse: attempt to open camera scanning
    await startCamera();
  }


  function stopCamera() {
    if (scanFrameRef.current && typeof window !== 'undefined') {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    scanLockRef.current = false;
    setCameraMode('idle');
  }

  async function startCamera() {
    if (!cameraSupported) {
      setCameraMessage('Live camera scanning is not supported on this device yet. Paste the profile link or scan an image instead.');
      return;
    }

    try {
      setCameraMode('starting');
      setCameraMessage('Allow camera access to scan attendee QR codes.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraMode('live');
      setCameraMessage('Camera is live. Point it at a member profile QR code.');

      const scanLoop = async () => {
        if (!videoRef.current || !detectorRef.current || scanLockRef.current) {
          scanFrameRef.current = window.requestAnimationFrame(scanLoop);
          return;
        }

        try {
          const results = await detectorRef.current.detect(videoRef.current);
          const match = results.find((item: any) => item?.rawValue);
          if (match?.rawValue) {
            scanLockRef.current = true;
            setScanValue(match.rawValue);
            const didCheckIn = await processScanValue(match.rawValue);
            if (didCheckIn) {
              setCameraMessage('QR captured and attendee checked in.');
              stopCamera();
              return;
            }
            scanLockRef.current = false;
          }
        } catch {
          setCameraMessage('Camera opened, but the QR still needs a clearer view.');
        }

        scanFrameRef.current = window.requestAnimationFrame(scanLoop);
      };

      scanFrameRef.current = window.requestAnimationFrame(scanLoop);
    } catch (error: any) {
      stopCamera();
      const message =
        error?.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in your browser and try again.'
          : error?.name === 'NotFoundError'
            ? 'No usable camera was found on this device.'
            : 'Unable to start the camera right now.';
      setCameraMessage(message);
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!detectorRef.current) {
      setCameraMessage('Image scanning is not supported on this device. Paste the attendee profile link instead.');
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const results = await detectorRef.current.detect(bitmap);
      const match = results.find((item: any) => item?.rawValue);
      if (!match?.rawValue) {
        setScanResult('No QR code was detected in that image.');
      } else {
        setScanValue(match.rawValue);
        await processScanValue(match.rawValue);
      }
    } catch {
      setScanResult('That image could not be scanned. Try a clearer QR image or use the live camera option.');
    } finally {
      event.target.value = '';
    }
  }

  const filtered = registrations.filter((registration) => {
    const q = query.trim().toLowerCase();
    const checkedIn = Boolean(attendance[registration.id!]);
    if (viewMode === 'waiting' && checkedIn) return false;
    if (viewMode === 'checked-in' && !checkedIn) return false;
    if (!q) return true;
    return registration.fullName.toLowerCase().includes(q) || registration.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <EventWorkspaceHeader
        eyebrow="Host operations"
        title="Host check-in"
        description="Scan attendee profile links, search by name, and keep your live attendance board moving during the event."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Checked in', value: checkedInCount, hint: `${Math.max(0, totalCount - checkedInCount)} still waiting` },
          { label: 'Assigned hosts', value: hosts.length, hint: 'Add extra hosts for doors or sections' },
        ]}
        aside={
          events.length > 1 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Event switching</div>
              <div className="mt-2 text-sm font-extrabold">
                {selectedEventIndex + 1} of {events.length} assigned events
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => canGoToPreviousEvent && setSelectedEventId(events[selectedEventIndex - 1].id!)}
                  disabled={!canGoToPreviousEvent}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => canGoToNextEvent && setSelectedEventId(events[selectedEventIndex + 1].id!)}
                  disabled={!canGoToNextEvent}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Host quick panel</div>
                <div className="mt-2 text-sm font-extrabold">{selectedEvent ? selectedEvent.name : 'Pick an event to begin'}</div>
                {events.length > 1 ? (
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    Multiple assigned events are supported here. Switch events from the selector above without leaving check-in.
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/event-platform/certificates" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                  Certificates
                </a>
                {selectedEvent?.slug ? (
                  <a href={`/event-platform/e/${selectedEvent.slug}`} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                    Public page
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Waiting</div>
                <div className="mt-1 text-lg font-extrabold">{Math.max(0, totalCount - checkedInCount)}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Checked in</div>
                <div className="mt-1 text-lg font-extrabold">{checkedInCount}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/35 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Host team</div>
                <div className="mt-1 text-lg font-extrabold">{hosts.length}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">QR scan</div>
            <div className="mt-2 text-sm font-extrabold">Check in by scanning a profile QR</div>
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Camera className="h-4 w-4 text-[var(--primary)]" />
                Open a profile QR or paste the profile URL below
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={scanValue}
                  onChange={(event) => setScanValue(event.target.value.slice(0, 240))}
                  placeholder="/member/user-123 or /g/guild-456"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={Boolean(checkingIn) || checkInGuard.isCoolingDown}
                  className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
                >
                  Scan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cameraMode === 'live' || cameraMode === 'starting') {
                      stopCamera();
                    } else {
                      setScanResult(null);
                      startCamera();
                    }
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]"
                >
                  {cameraMode === 'live' || cameraMode === 'starting' ? 'Stop' : 'Open camera'}
                </button>
              </div>

              {cameraMessage ? <p className="mt-2 text-xs text-[var(--text-secondary)]">{cameraMessage}</p> : null}
              {scanResult ? <p className="mt-2 text-xs text-[var(--text-secondary)]">{scanResult}</p> : null}

              {(cameraMode === 'starting' || cameraMode === 'live') && (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-black/5 overflow-hidden">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-44 object-cover bg-black"
                  />
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <QrCode className="h-3.5 w-3.5" />
                Camera-ready scanning is available from your host device when a profile QR is shared.
              </div>

            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Search</div>
                <div className="mt-2 text-sm font-extrabold">Check in by name or email</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'waiting', label: 'Waiting' },
                  { id: 'checked-in', label: 'Checked in' },
                  { id: 'all', label: 'All' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setViewMode(option.id as 'waiting' | 'checked-in' | 'all')}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                      viewMode === option.id
                        ? 'border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'border border-[var(--border)] bg-[var(--card-subtle)]/40 text-[var(--text-muted)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-9 py-2 text-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value.slice(0, 80))}
                  onBlur={() => setQuery(query.trim())}
                  placeholder="Search attendees..."
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              {loading ? (
                <div className="text-sm text-[var(--text-secondary)]">Loading attendees...</div>
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
                              <span className="text-xs font-bold text-[var(--success)]">Checked in</span>
                            ) : (
                              <span className="text-xs font-bold text-[var(--text-secondary)]">Waiting</span>
                            )}
                          </td>
                          <td className="py-3">
                            {checkedIn ? (
                              <button
                                type="button"
                                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-2 text-xs font-bold text-[var(--text-secondary)]"
                                disabled
                              >
                                Done
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => checkIn(registration.id!, registration.fullName, registration.email)}
                                className="min-h-10 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-black hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={Boolean(checkingIn) || checkInGuard.isCoolingDown || isClosed}
                              >
                                {checkingIn === registration.id ? 'Checking in...' : 'Check in'}
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
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Event hosts</div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={hostInput}
                onChange={(event) => setHostInput(event.target.value.slice(0, 180))}
                onBlur={() => setHostInput(hostInput.trim())}
                placeholder="Add host via public profile URL"
                autoComplete="off"
              />
              <button type="button" onClick={addHost} disabled={hostGuard.isCoolingDown || !hostInput.trim()} className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-black disabled:opacity-50">
                {hostGuard.isCoolingDown ? `Wait ${hostGuard.remainingSeconds}s` : 'Add'}
              </button>
            </div>
            {hostMessage ? <p className="mt-2 text-xs text-[var(--text-secondary)]">{hostMessage}</p> : null}
            <div className="mt-3 space-y-2">
              {hosts.length ? (
                hosts.map((host) => (
                  <div key={`${host.publicProfileUrl || host.userId}-${host.grantedAt || ''}`} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-2 text-sm">
                    <div className="font-semibold">{host.displayName || host.publicProfileUrl || host.userId}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{host.publicProfileUrl || host.userId}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">
                  No hosts assigned yet.
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Certificate readiness</div>
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Step 3</div>
              <div className="text-sm font-extrabold">{checkedInCount} attendees ready</div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                Checked-in participants are now available for certificate issuing in the next step.
              </div>
              <a
                href="/event-platform/certificates"
                className="mt-4 block w-full rounded-xl bg-[var(--primary)] py-2.5 text-center text-xs font-extrabold text-black hover:opacity-95"
              >
                Issue certificates
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

