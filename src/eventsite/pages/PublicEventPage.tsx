import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  Ticket,
  CheckCircle2,
  Building2,
  Mail,
  ListChecks,
  Star,
  ArrowRight,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEventViewerRole } from '../lib/eventAccess';
import { getEventBySlug, getRegistrationsForEvent, registerForEvent, updateEventDetails, upsertTicketTiers } from '../lib/firestoreEvents';
import type { EventRegistrationField, TicketTier } from '../lib/eventModels';
import { buildEventEditorDraft, parseList } from '../lib/eventEditor';
import { getEventAvailabilityMessage, isEventRegistrationOpen } from '../lib/eventAccess';
import { calculateCommissionBreakdown, formatCurrency, getEventCommissionPercent } from '../lib/pricing';
import { useActionGuard } from '../lib/useActionGuard';

function getApiBase() {
  return '/api';
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function formatMoney(currency: string | undefined, amount: number) {
  return currency === 'INR' || !currency ? `₹${amount}` : `${amount} ${currency}`;
}

function toBulletList(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item));
  if (typeof value === 'string') {
    return value
      .split(/\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

type EventLike = any;

type CanEdit = boolean;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PublicEventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { firebaseUser, loading: authLoading, profile } = useAuth();
  const eventSlug = slug || '';

  const [event, setEvent] = useState<EventLike | null>(null);
  const [loading, setLoading] = useState(true);

  const [tierTiersEnabled, setTierTiersEnabled] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [regs, setRegs] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState<{ fullName: string; email: string; qty: number }>({ fullName: '', email: '', qty: 1 });
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsFeedback, setDetailsFeedback] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<any>(null);
  const registrationGuard = useActionGuard({ cooldownMs: 30000, maxAttempts: 2, windowMs: 60000 });
  const detailsGuard = useActionGuard({ cooldownMs: 10000, maxAttempts: 2, windowMs: 30000 });

  const canEdit: CanEdit = Boolean(profile && ['organizationRepresentative', 'organization'].includes(profile.role || ''));
  const isClosed = Boolean(event?.status === 'completed');

  const customFields = useMemo(() => ((event as any)?.registrationFormFields || []) as EventRegistrationField[], [event]);
  const highlights = useMemo(() => toBulletList(event?.highlights), [event]);
  const whatToExpect = useMemo(() => toBulletList(event?.whatToExpect), [event]);
  const includes = useMemo(() => toBulletList(event?.includes), [event]);
  const agendaItems = useMemo(() => toBulletList(event?.agenda), [event]);

  const tiers: TicketTier[] = useMemo(() => {
    if (!event) return [];
    return ((event as any).ticketTiers || []) as TicketTier[];
  }, [event]);

  const selectedTier = useMemo(() => tiers.find((tier) => tier.id === selectedTierId), [tiers, selectedTierId]);

  const selectedTierBreakdown = useMemo(() => {
    const amount = (selectedTier?.price || 0) * Math.max(1, Number(form.qty) || 1);
    return calculateCommissionBreakdown(amount, getEventCommissionPercent(event as any));
  }, [selectedTier, form.qty, event]);

  const viewerRegistration = useMemo(() => {
    if (!firebaseUser) return null;
    return regs.find((registration) => {
      if (registration.userId && registration.userId === firebaseUser.uid) return true;
      if (registration.profileUrl && registration.profileUrl === `/member/${firebaseUser.uid}`) return true;
      if (firebaseUser.email && registration.email?.toLowerCase() === firebaseUser.email.toLowerCase()) return true;
      return false;
    }) || null;
  }, [regs, firebaseUser]);

  const viewerRole = useMemo(
    () =>
      getEventViewerRole(
        event,
        profile
          ? {
              uid: profile.uid,
              role: profile.role,
              organizationId: profile.organizationId,
              organizationName: profile.organizationName,
              email: profile.email,
            }
          : { uid: firebaseUser?.uid },
        firebaseUser?.uid
      ),
    [event, profile, firebaseUser]
  );

  const roleSummary = useMemo(() => {
    if (viewerRole === 'organizer') {
      return {
        label: 'Organizer view',
        title: 'You can manage this event across the full workflow.',
        body: 'Open ticketing, attendance, promotion, and certificates directly from this public page context.',
      };
    }
    if (viewerRole === 'host') {
      return {
        label: 'Host view',
        title: 'You can support live event operations here.',
        body: 'Use attendance and certificate tools to run arrivals and post-event delivery for this event.',
      };
    }
    if (viewerRegistration) {
      return {
        label: 'Attendee view',
        title: 'You are already registered for this event.',
        body: 'Your booking is recorded and will appear in the host check-in flow when you arrive.',
      };
    }
    if (firebaseUser) {
      return {
        label: 'Member view',
        title: 'You are signed in and ready to book.',
        body: 'Choose a ticket, complete checkout, and your registration will be visible to organizers and hosts instantly.',
      };
    }
    return {
      label: 'Guest view',
      title: 'Review the event and sign in when you are ready to register.',
      body: 'Guests can explore the event first, then continue to sign in for ticket purchase and booking confirmation.',
    };
  }, [viewerRole, viewerRegistration, firebaseUser]);

  const viewerPaymentLabel = useMemo(() => {
    if (!viewerRegistration?.paymentStatus) return null;
    if (viewerRegistration.paymentStatus === 'paid') return 'Payment confirmed';
    if (viewerRegistration.paymentStatus === 'pending') return 'Payment pending';
    if (viewerRegistration.paymentStatus === 'failed') return 'Payment failed';
    if (viewerRegistration.paymentStatus === 'refunded') return 'Payment refunded';
    return viewerRegistration.paymentStatus;
  }, [viewerRegistration]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('razorpay-checkout-script');
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!eventSlug) return;
    setLoading(true);
    getEventBySlug(eventSlug)
      .then((e) => {
        const eventData = e as any;
        setEvent(eventData);
        setSelectedTierId(((eventData?.ticketTiers?.[0]?.id as string) || ''));
        setTierTiersEnabled(Boolean(eventData?.ticketTiersEnabled ?? true));
        setAnswers({});
        setEditorDraft(buildEventEditorDraft(eventData));
      })
      .finally(() => setLoading(false));
  }, [eventSlug]);

  useEffect(() => {
    if (!event?.id) return;
    getRegistrationsForEvent(event.id)
      .then(setRegs)
      .catch((e: unknown) => console.error(e));
  }, [event?.id]);

  const soldByTier = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of regs) {
      map[r.tierId] = (map[r.tierId] || 0) + Number(r.qty || 0);
    }
    return map;
  }, [regs]);

  const remainingSeats = (tier: TicketTier) => {
    const sold = soldByTier[tier.id] || 0;
    return Math.max(0, Number(tier.capacity || 0) - sold);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!event?.id) return;
    if (authLoading) return;

    // Prevent checkout if closed.
    if (!isEventRegistrationOpen(event)) {
      setSubmitError(getEventAvailabilityMessage(event));
      return;
    }

    if (!firebaseUser) {
      setSubmitError('Please sign in before buying a ticket.');
      navigate(`/auth?redirect=/event-platform/e/${eventSlug}`);
      return;
    }

    if (!consentAccepted) {
      setSubmitError('Please confirm that you agree to the privacy, refund, and organizer-sharing terms before registering.');
      return;
    }

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    if (fullName.length < 2) {
      setSubmitError('Enter your full name before registering.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setSubmitError('Enter a valid email address.');
      return;
    }
    if (!selectedTierId) {
      setSubmitError('Choose a ticket tier before registering.');
      return;
    }

    const guardMessage = registrationGuard.guardAction(`Registration attempts are cooling down. Try again in ${Math.max(1, registrationGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setSubmitError(guardMessage);
      return;
    }

    for (const field of customFields) {
      if (field.required && !String(answers[field.id] || '').trim()) {
        registrationGuard.release();
        setSubmitError(`${field.label} is required.`);
        return;
      }
    }

    const selectedTierLocal = tiers.find((tier) => tier.id === selectedTierId);
    const qty = Math.max(1, Number(form.qty) || 1);
    const amount = (selectedTierLocal?.price || 0) * qty;
    const currency = (event as any)?.currency || 'INR';

    const completeRegistration = async (paymentStatus: 'paid' | 'pending', paymentId?: string, orderId?: string) => {
      const created = await registerForEvent({
        eventId: event.id,
        tierId: selectedTierId,
        fullName,
        email,
        qty,
        answers,
        userId: firebaseUser?.uid,
        profileUrl: firebaseUser?.uid ? `/member/${firebaseUser.uid}` : undefined,
        paymentStatus,
        paymentProvider: 'razorpay',
        paymentAmount: amount,
        paymentCurrency: currency,
        orderId,
        paymentId,
        paidAt: paymentStatus === 'paid' ? new Date().toISOString() : undefined,
      });

      const fresh = await getRegistrationsForEvent(event.id);
      setRegs(fresh);
      setForm({ fullName: '', email: '', qty: 1 });
      setAnswers({});
      setConsentAccepted(false);
      if (created?.tierId) setSelectedTierId(created.tierId);
      setSuccessMessage(
        paymentStatus === 'paid'
          ? `Ticket reserved successfully for ${fullName}. Your payment is recorded and the organizer can see the booking.`
          : `Ticket request saved for ${fullName}. Payment is still pending.`
      );
    };

    const verifyWithServer = async (response: any, resolvedOrderId: string) => {
      const verifyRes = await fetch(`${getApiBase()}/verify-razorpay-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedTierId,
          fullName,
          email,
          qty,
          amount: amount * 100,
          currency,
          orderId: response?.razorpay_order_id || resolvedOrderId,
          paymentId: response?.razorpay_payment_id,
          razorpaySignature: response?.razorpay_signature,
          metadata: { slug: eventSlug },
        }),
      });

      const verifyText = await verifyRes.text();
      const verifyData = verifyText
        ? (() => {
            try {
              return JSON.parse(verifyText);
            } catch {
              return null;
            }
          })()
        : null;

      if (!verifyRes.ok || !verifyData?.success) {
        throw new Error(verifyData?.message || 'Payment verification failed.');
      }

      await completeRegistration('paid', response?.razorpay_payment_id, response?.razorpay_order_id || resolvedOrderId);
    };

    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      if (amount > 0 && typeof window !== 'undefined' && window.Razorpay) {
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY;
        if (!razorpayKey) {
          throw new Error('Razorpay key is not configured (VITE_RAZORPAY_KEY missing)');
        }

        const orderRes = await fetch(`${getApiBase()}/create-razorpay-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            tierId: selectedTierId,
            fullName,
            email,
            qty,
            amount: amount * 100,
            currency,
            metadata: { slug: eventSlug },
          }),
        });

        const text = await orderRes.text();
        const orderData = text
          ? (() => {
              try {
                return JSON.parse(text);
              } catch {
                return null;
              }
            })()
          : null;

        const resolvedOrderId = orderData?.data?.order_id || orderData?.order_id || orderData?.id;
        const resolvedAmount = orderData?.data?.amount ?? orderData?.amount ?? amount * 100;
        const resolvedCurrency = orderData?.data?.currency || orderData?.currency || currency;

        if (!orderRes.ok) {
          throw new Error(orderData?.message || orderData?.error || `Order creation failed (HTTP ${orderRes.status})`);
        }
        if (!resolvedOrderId) {
          throw new Error(orderData?.message || orderData?.error || 'Order creation failed: missing order_id');
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY,
          amount: Number(resolvedAmount),
          currency: resolvedCurrency,
          name: event.organizationName || event.name,
          description: `${selectedTierLocal?.name || 'Ticket'} for ${event.name}`,
          order_id: resolvedOrderId,
          handler: async (response: any) => {
            await verifyWithServer(response, resolvedOrderId);
          },
          modal: {
            ondismiss: async () => {
              await completeRegistration('pending');
            },
          },
          prefill: {
            name: fullName,
            email,
          },
          theme: { color: '#f59e0b' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      await completeRegistration('paid');
    } catch (err: any) {
      console.error(err);
      registrationGuard.release();
      setSubmitError(err?.message ? String(err.message) : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!event?.id) return;
    if (!profile || !['organizationRepresentative', 'organization'].includes(profile.role || '')) return;
    const guardMessage = detailsGuard.guardAction(`Event detail updates are cooling down. Try again in ${Math.max(1, detailsGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setDetailsFeedback(guardMessage);
      return;
    }

    setSavingDetails(true);
    setDetailsFeedback(null);

    try {
      const payload = {
        name: editorDraft.name.trim(),
        description: editorDraft.description.trim(),
        startAt: editorDraft.startDate && editorDraft.startTime ? `${editorDraft.startDate}T${editorDraft.startTime}` : undefined,
        endAt: editorDraft.endDate && editorDraft.endTime ? `${editorDraft.endDate}T${editorDraft.endTime}` : undefined,
        visibility: editorDraft.visibility,
        status: editorDraft.status,
        currency: editorDraft.currency,
        ticketTiersEnabled: editorDraft.ticketTiersEnabled,
        venue: editorDraft.venue.trim() || undefined,
        location: editorDraft.location.trim() || undefined,
        badgeLabel: editorDraft.badgeLabel.trim() || undefined,
        heroImageUrl: editorDraft.heroImageUrl.trim() || undefined,
        contactEmail: editorDraft.contactEmail.trim() || undefined,
        organizerBio: editorDraft.organizerBio.trim() || undefined,
        agenda: parseList(editorDraft.agenda),
        highlights: parseList(editorDraft.highlights),
        whatToExpect: parseList(editorDraft.whatToExpect),
        includes: parseList(editorDraft.includes),
        registrationNote: editorDraft.registrationNote.trim() || undefined,
        registrationFormFields: editorDraft.questions
          .filter((question: any) => question.label?.trim())
          .map((question: any) => ({
            id: question.id,
            label: question.label.trim(),
            type: question.type,
            required: question.required,
            options:
              question.type === 'select'
                ? question.optionsText.split('\n').map((item: string) => item.trim()).filter(Boolean)
                : [],
          })),
      } as any;

      await updateEventDetails(event.id, payload);

      if (editorDraft.ticketTiersEnabled) {
        await upsertTicketTiers(
          event.id,
          editorDraft.tiers.map((tier: TicketTier) => ({
            ...tier,
            price: Number(tier.price || 0),
            capacity: Number(tier.capacity || 0),
          }))
        );
      }

      setEvent({ ...event, ...payload, ticketTiers: editorDraft.ticketTiersEnabled ? editorDraft.tiers : event.ticketTiers });
      setEditorDraft(buildEventEditorDraft({ ...event, ...payload, ticketTiers: editorDraft.tiers }));
      setIsEditing(false);
      setDetailsFeedback('Event details updated successfully.');
    } catch (error) {
      console.error(error);
      detailsGuard.release();
      setDetailsFeedback('Unable to save the updated event details right now.');
    } finally {
      setSavingDetails(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-xs text-[var(--text-muted)]">Loading event…</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h3 className="text-lg font-extrabold">Event not found</h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-4 py-3 text-sm text-[var(--text-secondary)]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Organizer event portal</div>
            <div className="font-semibold text-[var(--text)]">{event.organizationName || 'Private event page'}</div>
          </div>

          {!firebaseUser ? (
            <Link
              to={`/auth?redirect=/event-platform/e/${eventSlug}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 font-semibold text-[var(--text)] hover:bg-[var(--card-subtle)]/70"
            >
              Sign in or register
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card-subtle)]/20 shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {event.organizationName || 'Organized event'}
                </div>

                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing((value) => !value);
                      setDetailsFeedback(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold"
                  >
                    {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    {isEditing ? 'Cancel edit' : 'Edit details'}
                  </button>
                ) : null}
              </div>

              <h1 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight">{event.name}</h1>
              {event.description ? <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{event.description}</p> : null}

              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/35 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">{roleSummary.label}</div>
                    <div className="mt-2 text-sm font-extrabold">{roleSummary.title}</div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">{roleSummary.body}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!firebaseUser ? (
                      <Link
                        to={`/auth?redirect=/event-platform/e/${eventSlug}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-extrabold text-black"
                      >
                        Sign in to register
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                    {viewerRole === 'organizer' ? (
                      <>
                        <Link to="/event-platform/ticketing" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                          Ticketing
                        </Link>
                        <Link to="/event-platform/promotion" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                          Promotion
                        </Link>
                      </>
                    ) : null}
                    {viewerRole === 'host' ? (
                      <>
                        <Link to="/event-platform/attendance" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                          Attendance
                        </Link>
                        <Link to="/event-platform/certificates" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                          Certificates
                        </Link>
                      </>
                    ) : null}
                    {viewerRegistration ? (
                      <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Registered
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {event.startAt ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Date
                    </div>
                    <div className="mt-2 text-sm font-semibold">{new Date(event.startAt).toLocaleDateString()}</div>
                  </div>
                ) : null}

                {event.startAt ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <Clock3 className="h-3.5 w-3.5" />
                      Time
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      {new Date(event.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <MapPin className="h-3.5 w-3.5" />
                    Venue
                  </div>
                  <div className="mt-2 text-sm font-semibold">{event.venue || event.location || event.organizationName || 'Online / Private'}</div>
                </div>
              </div>

              {event.badgeLabel ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
                  <Star className="h-3.5 w-3.5" />
                  {event.badgeLabel}
                </div>
              ) : null}

              {isEditing ? (
                <form onSubmit={handleSaveDetails} className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Edit public event details</div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Event name</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.name || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, name: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Badge / tagline</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.badgeLabel || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, badgeLabel: e.target.value }))}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Description</div>
                    <textarea
                      className="mt-1 w-full min-h-[110px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      value={editorDraft?.description || ''}
                      onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, description: e.target.value }))}
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Venue</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.venue || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, venue: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Location</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.location || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, location: e.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Hero image URL</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.heroImageUrl || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, heroImageUrl: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Contact email</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.contactEmail || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, contactEmail: e.target.value }))}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Organizer bio</div>
                    <textarea
                      className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      value={editorDraft?.organizerBio || ''}
                      onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, organizerBio: e.target.value }))}
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Highlights</div>
                      <textarea
                        className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.highlights || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, highlights: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">What to expect</div>
                      <textarea
                        className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.whatToExpect || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, whatToExpect: e.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Agenda</div>
                      <textarea
                        className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.agenda || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, agenda: e.target.value }))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Includes</div>
                      <textarea
                        className="mt-1 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={editorDraft?.includes || ''}
                        onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, includes: e.target.value }))}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Registration note</div>
                    <textarea
                      className="mt-1 w-full min-h-[80px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                      value={editorDraft?.registrationNote || ''}
                      onChange={(e) => setEditorDraft((draft: any) => ({ ...draft, registrationNote: e.target.value }))}
                    />
                  </label>

                  <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingDetails} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-extrabold text-black">
                      {savingDetails ? 'Saving…' : <><Save className="h-3.5 w-3.5" /> Save changes</>}
                    </button>
                  </div>
                </form>
              ) : null}

              {detailsFeedback ? <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600">{detailsFeedback}</div> : null}

              {event.heroImageUrl ? (
                <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card-subtle)]/30">
                  <img src={event.heroImageUrl} alt={event.name} className="h-56 w-full object-cover" />
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {highlights.length ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <Star className="h-3.5 w-3.5" />Highlights
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {highlights.map((item: string) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {agendaItems.length ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <ListChecks className="h-3.5 w-3.5" />Agenda
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {agendaItems.map((item: string) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {whatToExpect.length ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <ListChecks className="h-3.5 w-3.5" />What to expect
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {whatToExpect.map((item: string) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {includes.length ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />Includes
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      {includes.map((item: string) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <Building2 className="h-3.5 w-3.5" />Organizer
                  </div>
                  <div className="mt-3 text-sm font-extrabold">{event.organizationName || 'Organizer'}</div>
                  {event.organizerBio ? <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{event.organizerBio}</p> : null}
                  {event.contactEmail ? (
                    <a href={`mailto:${event.contactEmail}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                      <Mail className="h-4 w-4" />{event.contactEmail}
                    </a>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    <Ticket className="h-3.5 w-3.5" />Registration note
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{event.registrationNote || 'No extra registration note has been shared for this event yet.'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--card-subtle)]/50 p-6 md:p-8 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                <Ticket className="h-4 w-4" />
                Secure ticket checkout
              </div>

              <p className="mt-3 text-sm text-[var(--text-secondary)]">Fast, secure payments via Razorpay and instant booking confirmation for the organizer.</p>

              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/35 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Payment guide</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Gateway</div>
                    <div className="mt-1 text-sm font-extrabold">{(event as any)?.paymentProvider === 'razorpay' ? 'Razorpay' : 'Online checkout'}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Your total</div>
                    <div className="mt-1 text-sm font-extrabold">{formatCurrency((event as any)?.currency, selectedTierBreakdown.grossAmount)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">After checkout</div>
                    <div className="mt-1 text-sm font-extrabold">{viewerPaymentLabel || 'Booking shows up for organizers instantly'}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--text-secondary)]">
                  Paid bookings are confirmed for the organizer and host tools. If you close the payment window, your request may be saved as pending until payment is completed.
                </div>
              </div>

              {successMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage}
                  </div>
                </div>
              ) : null}

              {viewerRegistration ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-extrabold">Your booking record</div>
                    <div className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                      {viewerPaymentLabel || 'Recorded'}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    Tier: {tiers.find((tier) => tier.id === viewerRegistration.tierId)?.name || viewerRegistration.tierId} • Qty {viewerRegistration.qty}
                  </div>
                </div>
              ) : null}

              {submitError ? (
                <div className="mt-4 rounded-2xl border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{submitError}</div>
              ) : null}

              {/* USER SIDE: when completed, do not show checkout at all */}
              {!canEdit && isClosed ? (
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Event closed
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    Registrations are no longer open.
                  </div>
                </div>
              ) : null}

              {/* ORG SIDE: allow viewing recap (but hide checkout) */}
              {canEdit && isClosed ? (
                <div className="mt-6">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Event closed
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-secondary)]">Here’s what happened during this event.</div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Started</div>
                      <div className="mt-2 text-sm font-extrabold">{event.startAt ? new Date(event.startAt).toLocaleString() : 'Not set'}</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Ended</div>
                      <div className="mt-2 text-sm font-extrabold">{event.endAt ? new Date(event.endAt).toLocaleString() : 'Not set'}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      <Ticket className="h-4 w-4 text-[var(--primary)]" />
                      Ticket summary
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Ticket tiers</div>
                        <div className="mt-1 text-sm font-extrabold">{event.ticketTiersEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Total bookings</div>
                        <div className="mt-1 text-sm font-extrabold">{regs.reduce((sum, r) => sum + Number(r.qty || 0), 0)}</div>
                      </div>
                    </div>

                    {tiers.length ? (
                      <div className="mt-4 space-y-2">
                        {tiers.map((t) => {
                          const sold = soldByTier[t.id] || 0;
                          const capacity = Number(t.capacity || 0);
                          const pct = capacity > 0 ? sold / capacity : 0;
                          return (
                            <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-semibold">{t.name}</div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                  {sold}/{capacity} sold
                                </div>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-[var(--card-subtle)]/60">
                                <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, pct * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Normal checkout flow (only if not closed) */}
              {!isClosed && tierTiersEnabled && isEventRegistrationOpen(event) ? (
                <div className="mt-6">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Choose a ticket</div>

                  <div className="mt-3 grid gap-3">
                    {tiers.map((t) => {
                      const remaining = remainingSeats(t);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTierId(t.id)}
                          aria-label={`Select tier ${t.name}`}
                          className={
                            selectedTierId === t.id
                              ? 'rounded-2xl border border-[var(--primary)]/40 bg-[var(--primary)]/10 p-4 text-left shadow-sm'
                              : 'rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4 text-left shadow-sm hover:bg-[var(--card-subtle)]/60'
                          }
                          disabled={remaining <= 0}
                        >
                          <div className="text-sm font-extrabold">{t.name}</div>
                          <div className="text-xs text-[var(--text-secondary)] mt-2">{formatMoney((event as any).currency, t.price)}</div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-2">Remaining: {remaining}</div>
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={submit} className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                    <div className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Total payable</div>
                          <div className="mt-2 text-lg font-extrabold text-[var(--text)]">{selectedTier?.name || 'Select a ticket'}</div>
                          <div className="mt-1 text-sm text-[var(--text-secondary)]">
                            {selectedTier ? `One ticket is ${formatMoney((event as any)?.currency, selectedTier.price)}` : 'Choose a ticket to continue'}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--primary)]/20 bg-black/20 px-3 py-2 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">You pay</div>
                          <div className="mt-1 text-xl font-extrabold text-[var(--primary)]">{formatCurrency((event as any)?.currency, selectedTierBreakdown.grossAmount)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block md:col-span-2">
                        <div className="text-xs font-bold text-[var(--text-secondary)]">Full name</div>
                        <input
                          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                          value={form.fullName}
                          onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                          placeholder="Your name"
                          required
                        />
                      </label>
                      <label className="block">
                        <div className="text-xs font-bold text-[var(--text-secondary)]">Email</div>
                        <input
                          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                          value={form.email}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="name@example.com"
                          required
                        />
                      </label>
                    </div>

                    {customFields.length ? (
                      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Additional details</div>
                        <div className="mt-3 space-y-3">
                          {customFields.map((field) => {
                            const value = answers[field.id] || '';
                            return (
                              <label key={field.id} className="block">
                                <div className="text-xs font-bold text-[var(--text-secondary)]">
                                  {field.label}
                                  {field.required ? ' *' : ''}
                                </div>

                                {field.type === 'textarea' ? (
                                  <textarea
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                                    value={value}
                                    onChange={(e) => setAnswers((p) => ({ ...p, [field.id]: e.target.value }))}
                                    required={field.required}
                                  />
                                ) : field.type === 'select' ? (
                                  <select
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                                    value={value}
                                    onChange={(e) => setAnswers((p) => ({ ...p, [field.id]: e.target.value }))}
                                    required={field.required}
                                  >
                                    <option value="">Select an option</option>
                                    {field.options?.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.type === 'number' ? (
                                  <input
                                    type="number"
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                                    value={value}
                                    onChange={(e) => setAnswers((p) => ({ ...p, [field.id]: e.target.value }))}
                                    required={field.required}
                                  />
                                ) : field.type === 'email' ? (
                                  <input
                                    type="email"
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                                    value={value}
                                    onChange={(e) => setAnswers((p) => ({ ...p, [field.id]: e.target.value }))}
                                    required={field.required}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                                    value={value}
                                    onChange={(e) => setAnswers((p) => ({ ...p, [field.id]: e.target.value }))}
                                    required={field.required}
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3 text-xs text-[var(--text-secondary)]">
                      <label className="flex items-start gap-2">
                        <input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} className="mt-0.5" />
                        <span>
                          I agree that my contact and booking details may be shared with the organizer for event delivery and support, and that I have read the refund and privacy terms.
                        </span>
                      </label>
                    </div>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <label className="block">
                        <div className="text-xs font-bold text-[var(--text-secondary)]">Quantity</div>
                        <input
                          type="number"
                          min={1}
                          className="mt-1 w-28 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                          value={form.qty}
                          onChange={(e) => setForm((p) => ({ ...p, qty: Number(e.target.value) }))}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-[var(--primary)] text-black font-extrabold px-4 py-2.5 text-xs hover:opacity-95 transition-opacity disabled:opacity-50"
                      >
                        {submitting ? 'Registering…' : 'Register'}
                      </button>
                    </div>

                    {submitError ? (
                      <div className="mt-3 text-xs text-[var(--error)] font-bold">{submitError}</div>
                    ) : null}

                    <div className="mt-3 text-[10px] text-[var(--text-muted)]">
                      Your booking is saved instantly and the organizer can follow payment status and attendee responses.
                    </div>
                  </form>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4 text-sm text-[var(--text-secondary)]">
                  {getEventAvailabilityMessage(event)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

