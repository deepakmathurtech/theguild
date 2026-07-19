import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BellRing, CheckCircle2, Clock3, Copy, ExternalLink, Ticket, Users, Wallet } from 'lucide-react';
import type { EventDocument, EventRegistrationField, TicketRegistration, TicketTier } from '../lib/eventModels';
import { createEvent, getEventsForHost, getRegistrationsForEvent, requestEventPayout, updateEventStatus, upsertTicketTiers } from '../lib/firestoreEvents';
import { canManageEvent } from '../lib/eventAccess';
import { calculateCommissionBreakdown, DEFAULT_GUILD_COMMISSION_PERCENT, formatCurrency, getEventCommissionPercent } from '../lib/pricing';
import { useActionGuard } from '../lib/useActionGuard';

function sanitizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseList(input: string) {
  return input
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type QuestionDraft = EventRegistrationField & { optionsText: string };
type FeedbackTone = 'success' | 'error';

export default function EventMaker() {
  const { profile, firebaseUser, loading } = useAuth();
  const navigate = useNavigate();

  const ownerUid = profile?.uid || firebaseUser?.uid;
  const canCreateEvents = Boolean(
    profile && ['organizationRepresentative', 'organization'].includes(profile.role) && (profile.organizationId || profile.organizationName || profile.fullName)
  );

  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [payoutUpdating, setPayoutUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('success');
  const createGuard = useActionGuard({ cooldownMs: 20000, maxAttempts: 2, windowMs: 60000 });
  const statusGuard = useActionGuard({ cooldownMs: 5000, maxAttempts: 3, windowMs: 30000 });
  const payoutGuard = useActionGuard({ cooldownMs: 60000, maxAttempts: 1, windowMs: 60000 });
  const shareGuard = useActionGuard({ cooldownMs: 2000, maxAttempts: 3, windowMs: 10000 });

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    visibility: 'public' as const,
    status: 'published' as EventDocument['status'],
    startAt: '',
    endAt: '',
    ticketTiersEnabled: true,
    currency: 'INR',
    venue: '',
    location: '',
    badgeLabel: '',
    heroImageUrl: '',
    contactEmail: '',
    organizerBio: '',
    agenda: '',
    highlights: '',
    whatToExpect: '',
    includes: '',
    registrationNote: '',
    tiers: [
      { id: 'tier1', name: 'General Pass', price: 199, capacity: 200 },
      { id: 'tier2', name: 'Student Pass', price: 99, capacity: 120 },
    ] as TicketTier[],
    questions: [{ id: 'q1', label: 'What do you want to learn?', type: 'text', required: true, optionsText: '' }] as QuestionDraft[],
  });

  useEffect(() => {
    if (!ownerUid || loading) return;
    getEventsForHost(ownerUid, profile?.uid ? `/member/${profile.uid}` : undefined)
      .then((data) => {
        const manageableEvents = data.filter((event) => canManageEvent(event, profile, ownerUid));
        setEvents(manageableEvents);
        if (!selectedEventId && manageableEvents[0]?.id) {
          setSelectedEventId(manageableEvents[0].id);
        }
      })
      .catch((e) => console.error(e));
  }, [ownerUid, loading, profile]);

  useEffect(() => {
    if (!form.name.trim()) return;
    if (form.slug.trim()) return;
    setForm((p) => ({ ...p, slug: sanitizeSlug(form.name) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoadingRegistrations(true);
    getRegistrationsForEvent(selectedEventId)
      .then(setRegistrations)
      .catch((e) => console.error(e))
      .finally(() => setLoadingRegistrations(false));
  }, [selectedEventId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerUid || !canCreateEvents) return;
    setFeedback(null);
    if (!form.name.trim() || form.name.trim().length < 3) {
      setFeedbackTone('error');
      setFeedback('Event name must be at least 3 characters.');
      return;
    }

    const slug = sanitizeSlug(form.slug || form.name);
    if (!slug) {
      setFeedbackTone('error');
      setFeedback('Add a valid URL slug using letters, numbers, or dashes.');
      return;
    }

    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      setFeedbackTone('error');
      setFeedback('Add a valid contact email or leave it blank.');
      return;
    }

    const guardMessage = createGuard.guardAction(`Event creation is cooling down. Try again in ${Math.max(1, createGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setFeedbackTone('error');
      setFeedback(guardMessage);
      return;
    }

    setBusy(true);
    try {
      const normalizedQuestions = form.questions
        .map((question) => ({
          id: question.id,
          label: question.label.trim(),
          type: question.type,
          required: question.required,
          options: question.type === 'select' ? question.optionsText.split('\n').map((option) => option.trim()).filter(Boolean) : [],
        }))
        .filter((question) => question.label);

      const created = await createEvent({
        slug,
        urlPath: `/event-platform/e/${slug}`,
        name: form.name.trim(),
        description: form.description.trim(),
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        visibility: form.visibility,
        status: form.status,
        ticketTiersEnabled: form.ticketTiersEnabled,
        currency: form.currency,
        venue: form.venue.trim() || undefined,
        location: form.location.trim() || undefined,
        badgeLabel: form.badgeLabel.trim() || undefined,
        heroImageUrl: form.heroImageUrl.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        organizerBio: form.organizerBio.trim() || undefined,
        agenda: form.agenda.trim() || undefined,
        highlights: parseList(form.highlights),
        whatToExpect: parseList(form.whatToExpect),
        includes: parseList(form.includes),
        registrationNote: form.registrationNote.trim() || undefined,
        registrationFormFields: normalizedQuestions,
        organizationId: profile?.organizationId || profile?.uid || '',
        organizationName: profile?.organizationName || profile?.fullName || 'Your organization',
        createdBy: ownerUid,
        paymentProvider: 'razorpay',
        paymentConfig: {
          platformCommissionPercent: DEFAULT_GUILD_COMMISSION_PERCENT,
        },
      } as any);

      if (form.ticketTiersEnabled) {
        await upsertTicketTiers(created.id, form.tiers);
      }

      setEvents((prev) => [{ id: created.id, ...(created as any) }, ...prev]);
      setSelectedEventId(created.id);
      navigate(`/event-platform/e/${slug}`);
    } catch (error) {
      console.error('Failed to create event', error);
      createGuard.release();
      setFeedbackTone('error');
      setFeedback('Unable to create this event right now. Please review the form and try again.');
    } finally {
      setBusy(false);
    }
  }

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);

  async function handleStatusChange(nextStatus: EventDocument['status']) {
    if (!selectedEvent?.id) return;
    const guardMessage = statusGuard.guardAction(`Status updates are cooling down. Try again in ${Math.max(1, statusGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setFeedbackTone('error');
      setFeedback(guardMessage);
      return;
    }

    setStatusUpdating(true);
    setFeedback(null);
    try {
      await updateEventStatus(selectedEvent.id, nextStatus);
      setEvents((prev) => prev.map((event) => event.id === selectedEvent.id ? { ...event, status: nextStatus, payoutStatus: nextStatus === 'completed' ? 'ready' : (event.payoutStatus || 'pending') } : event));
      setFeedbackTone('success');
      setFeedback(nextStatus === 'completed' ? 'Event marked completed. The payout is now ready for settlement.' : 'Event reopened for continued management.');
    } catch (error) {
      console.error('Failed to update event status', error);
      statusGuard.release();
      setFeedbackTone('error');
      setFeedback('Unable to update the event status right now.');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleDemandPayout() {
    if (!selectedEvent?.id) return;
    const guardMessage = payoutGuard.guardAction(`Payout requests are limited. Try again in ${Math.max(1, payoutGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setFeedbackTone('error');
      setFeedback(guardMessage);
      return;
    }

    setPayoutUpdating(true);
    setFeedback(null);
    try {
      const receptionistUid = (profile as any)?.assignedReceptionistId || (profile as any)?.assignedReceptionist || undefined;
      await requestEventPayout({
        eventId: selectedEvent.id,
        eventName: selectedEvent.name,
        actorUid: ownerUid || undefined,
        receptionistUid,
        note: 'Organizer requested payout release after the event concluded.',
      });
      setEvents((prev) => prev.map((event) => event.id === selectedEvent.id ? { ...event, payoutStatus: 'requested', payoutRequestedAt: new Date().toISOString() } : event));
      setFeedbackTone('success');
      setFeedback('Payout demand submitted and the receptionist has been notified.');
    } catch (error) {
      console.error('Failed to request payout', error);
      payoutGuard.release();
      setFeedbackTone('error');
      setFeedback('Unable to submit the payout request right now.');
    } finally {
      setPayoutUpdating(false);
    }
  }

  const summary = useMemo(() => {
    const tiers = ((selectedEvent as any)?.ticketTiers || []) as TicketTier[];
    const sold = registrations.reduce((sum, registration) => sum + Number(registration.qty || 0), 0);
    const capacity = tiers.reduce((sum, tier) => sum + Number(tier.capacity || 0), 0);
    const grossRevenue = registrations.reduce((sum, registration) => {
      const tier = tiers.find((item) => item.id === registration.tierId);
      return sum + Number(tier?.price || 0) * Number(registration.qty || 0);
    }, 0);
    const commission = calculateCommissionBreakdown(grossRevenue, getEventCommissionPercent(selectedEvent as any));
    return {
      sold,
      capacity,
      remaining: Math.max(0, capacity - sold),
      grossRevenue,
      commission,
    };
  }, [registrations, selectedEvent]);

  const tier = form.tiers;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base md:text-lg font-extrabold tracking-tight">Event Maker</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Create public events and collect ticket payments through Razorpay. A public event page is created at:
          <span className="text-[var(--primary)] font-bold"> /event-platform/e/:slug</span>
        </p>
      </div>

      {!loading && !canCreateEvents ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 text-sm text-[var(--text-secondary)]">
          Only organization representatives and organization accounts can create events. Connect your organization profile to unlock the maker experience.
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            feedbackTone === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
              : 'border-red-500/20 bg-red-500/10 text-red-500'
          }`}
          role={feedbackTone === 'error' ? 'alert' : 'status'}
        >
          {feedback}
        </div>
      ) : null}

      {canCreateEvents ? (
        <form onSubmit={submit} className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Event name</div>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.slice(0, 90) }))}
                placeholder="e.g., Annual Meetup 2026"
                required
                minLength={3}
                maxLength={90}
              />
            </label>

            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Slug / URL token</div>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: sanitizeSlug(e.target.value).slice(0, 80) }))}
                placeholder="e.g., annual-meetup-2026"
                maxLength={80}
              />
            </label>
          </div>

          <label className="block">
            <div className="text-xs font-bold text-[var(--text-secondary)]">Description</div>
            <textarea
              className="mt-1 w-full min-h-[100px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value.slice(0, 1800) }))}
              placeholder="What attendees will get..."
              maxLength={1800}
            />
          </label>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Public page details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Hero image URL</div>
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.heroImageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, heroImageUrl: e.target.value.trim().slice(0, 300) }))}
                  placeholder="https://..."
                  type="url"
                  inputMode="url"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Badge / tagline</div>
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.badgeLabel}
                  onChange={(e) => setForm((p) => ({ ...p, badgeLabel: e.target.value }))}
                  placeholder="Featured community meetup"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Venue</div>
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.venue}
                  onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                  placeholder="Main Hall, 2nd Floor"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Location</div>
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Ludhiana, Punjab"
                />
              </label>
            </div>
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Organizer bio</div>
              <textarea
                className="mt-1 w-full min-h-[80px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.organizerBio}
                onChange={(e) => setForm((p) => ({ ...p, organizerBio: e.target.value }))}
                placeholder="Tell attendees who is hosting this experience"
              />
            </label>
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Contact email</div>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.contactEmail}
                onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value.trim().slice(0, 120) }))}
                placeholder="hello@organization.com"
                type="email"
                inputMode="email"
                maxLength={120}
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Highlights (one per line)</div>
                <textarea
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.highlights}
                  onChange={(e) => setForm((p) => ({ ...p, highlights: e.target.value }))}
                  placeholder="Networking lounge\nLive demos"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">What to expect (one per line)</div>
                <textarea
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.whatToExpect}
                  onChange={(e) => setForm((p) => ({ ...p, whatToExpect: e.target.value }))}
                  placeholder="Community walkthrough\nHands-on session"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Agenda / schedule</div>
                <textarea
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.agenda}
                  onChange={(e) => setForm((p) => ({ ...p, agenda: e.target.value }))}
                  placeholder="10:00 AM welcome\n11:00 AM session"
                />
              </label>
              <label className="block">
                <div className="text-xs font-bold text-[var(--text-secondary)]">Includes / perks</div>
                <textarea
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={form.includes}
                  onChange={(e) => setForm((p) => ({ ...p, includes: e.target.value }))}
                  placeholder="Certificate\nRefreshments"
                />
              </label>
            </div>
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Registration note</div>
              <textarea
                className="mt-1 w-full min-h-[70px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.registrationNote}
                onChange={(e) => setForm((p) => ({ ...p, registrationNote: e.target.value }))}
                placeholder="Share any note for attendees before they confirm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Start</div>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={(form.startAt || '').slice(0, 10)}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = (form.startAt || '').slice(11, 16);
                    setForm((p) => ({ ...p, startAt: `${date}T${time || '00:00'}` }));
                  }}
                />
                <input
                  type="time"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={(form.startAt || '').slice(11, 16)}
                  onChange={(e) => {
                    const time = e.target.value;
                    const date = (form.startAt || '').slice(0, 10) || '';
                    setForm((p) => ({ ...p, startAt: `${date || new Date().toISOString().slice(0, 10)}T${time}` }));
                  }}
                />
              </div>
            </label>
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">End</div>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={(form.endAt || '').slice(0, 10)}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = (form.endAt || '').slice(11, 16);
                    setForm((p) => ({ ...p, endAt: `${date}T${time || '00:00'}` }));
                  }}
                />
                <input
                  type="time"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                  value={(form.endAt || '').slice(11, 16)}
                  onChange={(e) => {
                    const time = e.target.value;
                    const date = (form.endAt || '').slice(0, 10) || '';
                    setForm((p) => ({ ...p, endAt: `${date || new Date().toISOString().slice(0, 10)}T${time}` }));
                  }}
                />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Visibility</div>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.visibility}
                onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as any }))}
              >
                <option value="public">public</option>
                <option value="unlisted">unlisted</option>
                <option value="private">private</option>
              </select>
            </label>
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Status</div>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EventDocument['status'] }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="block">
              <div className="text-xs font-bold text-[var(--text-secondary)]">Currency</div>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) }))}
                placeholder="INR"
                maxLength={3}
              />
            </label>
          </div>

          <label className="block">
            <div className="text-xs font-bold text-[var(--text-secondary)]">Enable ticket tiers</div>
            <label className="mt-2 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
              <input
                type="checkbox"
                checked={form.ticketTiersEnabled}
                onChange={(e) => setForm((p) => ({ ...p, ticketTiersEnabled: e.target.checked }))}
              />
              <span className="text-sm font-extrabold">Tickets + registrations will be enabled</span>
            </label>
          </label>

          {form.ticketTiersEnabled ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Ticket tiers</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {tier.map((t, idx) => (
                  <div key={t.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <label className="block md:col-span-2">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Name</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={t.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm((p) => ({
                            ...p,
                            tiers: p.tiers.map((x, i) => (i === idx ? { ...x, name: value } : x)),
                          }));
                        }}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Price</div>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={t.price}
                        onChange={(e) => {
                          const value = Math.max(0, Number(e.target.value));
                          setForm((p) => ({
                            ...p,
                            tiers: p.tiers.map((x, i) => (i === idx ? { ...x, price: value } : x)),
                          }));
                        }}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Capacity</div>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={t.capacity}
                        onChange={(e) => {
                          const value = Math.max(1, Math.floor(Number(e.target.value)));
                          setForm((p) => ({
                            ...p,
                            tiers: p.tiers.map((x, i) => (i === idx ? { ...x, capacity: value } : x)),
                          }));
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, tiers: p.tiers.filter((_, i) => i !== idx) }))}
                      className="hidden md:inline-flex px-3 py-2 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--text-secondary)] font-bold text-xs hover:bg-[var(--card-subtle)]/60"
                      disabled={form.tiers.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setForm((p) => ({
                    ...p,
                    tiers: [
                      ...p.tiers,
                      {
                        id: `tier${p.tiers.length + 1}`,
                        name: `Tier ${p.tiers.length + 1}`,
                        price: 100,
                        capacity: 100,
                      },
                    ],
                  }));
                }}
                className="mt-4 w-full rounded-xl bg-[var(--card-subtle)]/20 border border-[var(--border)] py-2.5 text-xs font-extrabold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/40"
              >
                + Add tier
              </button>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Registration form</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">Ask attendees a few questions before they buy tickets.</div>
              </div>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, questions: [...p.questions, { id: `q${p.questions.length + 1}`, label: '', type: 'text', required: false, optionsText: '' }] as QuestionDraft[] }))}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-extrabold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/50"
              >
                + Add question
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {form.questions.map((question, idx) => (
                <div key={question.id} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1.3fr_0.7fr_0.6fr] gap-3">
                    <label className="block">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Question</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={question.label}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm((p) => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, label: value } : q)) }));
                        }}
                        placeholder="e.g. What company do you work with?"
                      />
                    </label>
                    <label className="block">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Type</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={question.type}
                        onChange={(e) => {
                          const value = e.target.value as any;
                          setForm((p) => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, type: value } : q)) }));
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                        <option value="textarea">Paragraph</option>
                        <option value="select">Select</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => {
                          const value = e.target.checked;
                          setForm((p) => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, required: value } : q)) }));
                        }}
                      />
                      Required
                    </label>
                  </div>
                  {question.type === 'select' ? (
                    <label className="mt-3 block">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Options</div>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={question.optionsText}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm((p) => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, optionsText: value } : q)) }));
                        }}
                        placeholder="Option 1&#10;Option 2"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }))}
                    className="mt-3 text-xs font-bold text-[var(--error)] hover:underline"
                  >
                    Remove question
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || createGuard.isCoolingDown || loading || !ownerUid || !canCreateEvents}
            className="w-full rounded-xl bg-[var(--primary)] text-black font-extrabold py-2.5 text-xs hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {busy ? 'Creating...' : createGuard.isCoolingDown ? `Wait ${createGuard.remainingSeconds}s` : 'Create event + public page'}
          </button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Your events</div>
          <a
            href="/event-platform/history"
            className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70"
          >
            View history archive
          </a>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {events.length ? (
            events.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedEventId(e.id || null)}
                className={`rounded-2xl border p-4 text-left transition-colors ${selectedEventId === e.id ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card-subtle)]/30 hover:bg-[var(--card-subtle)]/60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">{e.name}</div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {e.startAt ? new Date(e.startAt).toLocaleString() : 'Schedule pending'}
                    </div>
                  </div>
                  <div className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                    {e.status || 'draft'}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <Ticket className="h-3.5 w-3.5" />
                  {e.ticketTiersEnabled ? 'Ticketing enabled' : 'No ticketing'}
                </div>
              </button>
            ))
          ) : (
            <div className="text-xs text-[var(--text-secondary)]">No events created yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Registration insights</div>
            <div className="mt-1 text-sm font-extrabold">{selectedEvent ? selectedEvent.name : 'Select an event'}</div>
          </div>
          {selectedEvent ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedEvent) return;
                  const guardMessage = shareGuard.guardAction('Copy action is cooling down. Try again in a moment.');
                  if (guardMessage) {
                    setFeedbackTone('error');
                    setFeedback(guardMessage);
                    return;
                  }
                  const url = `${window.location.origin}/event-platform/e/${selectedEvent.slug}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    setFeedbackTone('success');
                    setFeedback('Public event link copied.');
                    window.setTimeout(() => setShareCopied(false), 1500);
                  } catch {
                    shareGuard.release();
                    setFeedbackTone('error');
                    setFeedback('Unable to copy the public link. Open the page and copy it from the address bar.');
                  }
                }}
                disabled={shareGuard.isCoolingDown}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  {shareCopied ? 'Copied' : 'Copy public link'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedEvent?.status === 'completed' ? 'published' : 'completed')}
                disabled={statusUpdating || statusGuard.isCoolingDown}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 disabled:opacity-50"
              >
                {statusGuard.isCoolingDown ? `Wait ${statusGuard.remainingSeconds}s` : selectedEvent?.status === 'completed' ? 'Re-open event' : 'Mark as completed'}
              </button>
              <a
                href={`/event-platform/e/${selectedEvent.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70"
              >
                <span className="inline-flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open page
                </span>
              </a>
            </div>
          ) : null}
        </div>

        {selectedEvent ? (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Tickets sold</div>
                <div className="mt-1 text-xl font-extrabold">{summary.sold}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Capacity</div>
                <div className="mt-1 text-xl font-extrabold">{summary.capacity}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Net payout</div>
                <div className="mt-1 text-xl font-extrabold">{formatCurrency((selectedEvent as any)?.currency, summary.commission.organizationPayout)}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Guild fee</div>
                <div className="mt-1 text-xl font-extrabold">{formatCurrency((selectedEvent as any)?.currency, summary.commission.guildFee)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3 text-sm text-[var(--text-secondary)]">
              Gross sales: <span className="font-extrabold text-[var(--text)]">{formatCurrency((selectedEvent as any)?.currency, summary.commission.grossAmount)}</span>. Guild keeps <span className="font-extrabold text-[var(--primary)]">{summary.commission.commissionPercent}%</span> of each ticket amount, and the organization receives the remaining <span className="font-extrabold text-emerald-500">{100 - summary.commission.commissionPercent}%</span> after payment gateway costs are deducted.
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Payout release</div>
                  <div className="mt-1 text-sm font-extrabold">Funds are released when the event is completed or when you demand settlement.</div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    {selectedEvent.payoutStatus === 'requested' ? 'A payout demand is already pending review by your receptionist.' : selectedEvent.payoutStatus === 'ready' ? 'This event is ready for payout settlement.' : 'You can request payout now and your receptionist will be notified.'}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--primary)]/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                  {selectedEvent.payoutStatus || 'pending'}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleDemandPayout}
                  disabled={payoutUpdating || payoutGuard.isCoolingDown || selectedEvent.payoutStatus === 'requested'}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-extrabold text-black transition hover:opacity-95 disabled:opacity-50"
                >
                  <Wallet className="h-4 w-4" />
                  {payoutUpdating ? 'Submitting...' : payoutGuard.isCoolingDown ? `Wait ${payoutGuard.remainingSeconds}s` : selectedEvent.payoutStatus === 'requested' ? 'Payout requested' : 'Demand payout'}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedEvent?.status === 'completed' ? 'published' : 'completed')}
                  disabled={statusUpdating || statusGuard.isCoolingDown}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2.5 text-sm font-extrabold text-[var(--text-secondary)] transition hover:bg-[var(--card-subtle)]/70 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {statusGuard.isCoolingDown ? `Wait ${statusGuard.remainingSeconds}s` : selectedEvent?.status === 'completed' ? 'Re-open event' : 'Mark completed'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{selectedEvent.payoutRequestedAt ? `Requested ${new Date(selectedEvent.payoutRequestedAt).toLocaleString()}` : 'No payout request yet'}</span>
                <span className="inline-flex items-center gap-1"><BellRing className="h-3.5 w-3.5" />Receptionist notified when payout is demanded</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Users className="h-4 w-4 text-[var(--primary)]" />
                Attendee list
              </div>
              {loadingRegistrations ? (
                <div className="mt-3 text-sm text-[var(--text-secondary)]">Loading registrations…</div>
              ) : registrations.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Tier</th>
                        <th className="py-2 pr-3">Qty</th>
                        <th className="py-2">Form answers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((registration) => (
                        <tr key={registration.id} className="border-t border-[var(--border)]/70 align-top">
                          <td className="py-2 pr-3 font-medium">{registration.fullName}</td>
                          <td className="py-2 pr-3 text-[var(--text-secondary)]">{registration.email}</td>
                          <td className="py-2 pr-3 text-[var(--text-secondary)]">{registration.tierId}</td>
                          <td className="py-2 pr-3 text-[var(--text-secondary)]">{registration.qty}</td>
                          <td className="py-2">
                            {selectedEvent.registrationFormFields?.length ? (
                              <details className="text-xs text-[var(--text-secondary)]">
                                <summary className="cursor-pointer text-[var(--primary)]">View answers</summary>
                                <div className="mt-2 space-y-2">
                                  {Object.entries(registration.answers || {}).map(([fieldId, value]) => {
                                    const field = selectedEvent.registrationFormFields?.find((item) => item.id === fieldId);
                                    return (
                                      <div key={fieldId} className="rounded-lg border border-[var(--border)] bg-[var(--card-subtle)]/40 p-2">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{field?.label || fieldId}</div>
                                        <div className="mt-1 text-xs">{value}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            ) : (
                              <span className="text-[var(--text-secondary)]">No custom questions</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 text-sm text-[var(--text-secondary)]">No registrations yet. Share the public page and buyers will appear here.</div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
            Create or select an event to see sales and attendee details here.
          </div>
        )}
      </div>
    </div>
  );
}

