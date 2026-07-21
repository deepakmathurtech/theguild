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
  Globe,
  HelpCircle,
  Users2,
  MessageSquare,
  Plus,
  Trash2,
  Palette,
  ShieldCheck,
  Building,
  Info
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
  
  // Tab within details editor
  const [editorTab, setEditorTab] = useState<'general' | 'design' | 'speakers' | 'faqs'>('general');

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
        // Customized Public page options
        themePrimaryColor: editorDraft.themePrimaryColor,
        themeLayout: editorDraft.themeLayout,
        socialTwitter: editorDraft.socialTwitter,
        socialLinkedin: editorDraft.socialLinkedin,
        socialDiscord: editorDraft.socialDiscord,
        socialWebsite: editorDraft.socialWebsite,
        speakers: editorDraft.speakers,
        sponsors: editorDraft.sponsors,
        faqs: editorDraft.faqs,
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

  // Inline editor helper to add speakers/sponsors/faqs to editorDraft
  const addDraftSpeaker = () => {
    setEditorDraft((prev: any) => ({
      ...prev,
      speakers: [...(prev.speakers || []), { id: `sp-${Date.now()}`, name: '', role: '', company: '', bio: '', avatarUrl: '', twitter: '', linkedin: '' }]
    }));
  };

  const removeDraftSpeaker = (id: string) => {
    setEditorDraft((prev: any) => ({
      ...prev,
      speakers: prev.speakers.filter((s: any) => s.id !== id)
    }));
  };

  const updateDraftSpeaker = (id: string, fields: any) => {
    setEditorDraft((prev: any) => ({
      ...prev,
      speakers: prev.speakers.map((s: any) => s.id === id ? { ...s, ...fields } : s)
    }));
  };

  const addDraftSponsor = () => {
    setEditorDraft((prev: any) => ({
      ...prev,
      sponsors: [...(prev.sponsors || []), { id: `spon-${Date.now()}`, name: '', logoUrl: '', websiteUrl: '', tier: 'gold' }]
    }));
  };

  const removeDraftSponsor = (id: string) => {
    setEditorDraft((prev: any) => ({
      ...prev,
      sponsors: prev.sponsors.filter((s: any) => s.id !== id)
    }));
  };

  const updateDraftSponsor = (id: string, fields: any) => {
    setEditorDraft((prev: any) => ({
      ...prev,
      sponsors: prev.sponsors.map((s: any) => s.id === id ? { ...s, ...fields } : s)
    }));
  };

  const addDraftFaq = () => {
    setEditorDraft((prev: any) => ({
      ...prev,
      faqs: [...(prev.faqs || []), { id: `faq-${Date.now()}`, question: '', answer: '' }]
    }));
  };

  const removeDraftFaq = (id: string) => {
    setEditorDraft((prev: any) => ({
      ...prev,
      faqs: prev.faqs.filter((f: any) => f.id !== id)
    }));
  };

  const updateDraftFaq = (id: string, fields: any) => {
    setEditorDraft((prev: any) => ({
      ...prev,
      faqs: prev.faqs.map((f: any) => f.id === id ? { ...f, ...fields } : f)
    }));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <div className="text-sm text-[var(--text-muted)] animate-pulse flex items-center justify-center gap-2">
          <Clock3 className="h-4 w-4 animate-spin text-[var(--primary)]" />
          <span>Syncing with event registry…</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center space-y-4">
        <h3 className="text-xl font-extrabold text-white">Event not found</h3>
        <p className="text-sm text-[var(--text-muted)]">The requested public event route does not exist or has been archived.</p>
        <Link to="/" className="text-xs font-bold text-[var(--primary)] hover:underline inline-block">&larr; Return Home</Link>
      </div>
    );
  }

  // Set brand styling color variables dynamically
  const pageThemeColor = event.themePrimaryColor || '#dcb36c';
  const inlineThemeStyle = {
    '--primary': pageThemeColor,
    '--ring': pageThemeColor,
    '--accent': pageThemeColor,
    '--primary-dark': pageThemeColor
  } as React.CSSProperties;

  // Selected layout style classes
  const layoutStyle = event.themeLayout || 'modern_center';

  return (
    <div className="min-h-screen bg-[#060608] text-[var(--text)] transition-colors duration-300 pb-16" style={inlineThemeStyle}>
      <div className="mx-auto max-w-6xl px-4 py-4 md:py-6">
        
        {/* Portal Breadcrumb */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--border)] bg-black/40 px-4 py-3 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Verified Guild Event</span>
            <span className="text-white/20">|</span>
            <span className="font-semibold truncate text-white">{event.organizationName || 'Private Organizer'}</span>
          </div>

          {!firebaseUser ? (
            <Link
              to={`/auth?redirect=/event-platform/e/${eventSlug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              Sign in or Register
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {/* Top Control Bar for Organizers */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-black/80 to-[var(--primary)]/10 border border-[var(--border)] rounded-3xl mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Brand Experience controls</div>
              <div className="text-xs text-white/70">Configure speakers, FAQs, sponsor tiers, and layouts.</div>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(!isEditing);
                setDetailsFeedback(null);
                setEditorTab('general');
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-black px-4 py-2 text-xs font-extrabold hover:opacity-90 active:scale-95 transition"
            >
              {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              <span>{isEditing ? 'Close Live Editor' : 'Customize Page UI'}</span>
            </button>
          )}
        </div>

        {/* LIVE CUSTOMIZER FORM */}
        {isEditing && editorDraft && (
          <form onSubmit={handleSaveDetails} className="bg-[#101014] border border-[var(--primary)]/30 rounded-3xl p-5 mb-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Live Page Customizer</h3>
                <p className="text-[10px] text-white/40">These sections will appear directly on the live event page.</p>
              </div>
              <div className="flex items-center gap-1 bg-black/45 p-1 rounded-xl border border-white/5">
                {(['general', 'design', 'speakers', 'faqs'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEditorTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition ${
                      editorTab === tab ? 'bg-[var(--primary)] text-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Tab: General Details */}
            {editorTab === 'general' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="font-bold text-white/70">Event Name</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.name}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, name: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="font-bold text-white/70">Category Badge Tag</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.badgeLabel}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, badgeLabel: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="font-bold text-white/70">Description / Overview</span>
                  <textarea
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                    value={editorDraft.description}
                    onChange={(e) => setEditorDraft((d: any) => ({ ...d, description: e.target.value }))}
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="font-bold text-white/70">Venue Description</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.venue}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, venue: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="font-bold text-white/70">City / Location</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.location}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, location: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="font-bold text-white/70">Organizer Bio</span>
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.organizerBio}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, organizerBio: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="font-bold text-white/70">Contact email</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.contactEmail}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, contactEmail: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Editor Tab: Design & Layout */}
            {editorTab === 'design' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="grid gap-3 md:grid-cols-3 items-end">
                  <label className="block">
                    <span className="font-bold text-white/70">Brand Primary Color</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={editorDraft.themePrimaryColor}
                        onChange={(e) => setEditorDraft((d: any) => ({ ...d, themePrimaryColor: e.target.value }))}
                        className="w-8 h-8 rounded border border-white/15 bg-transparent cursor-pointer"
                      />
                      <span className="font-mono">{editorDraft.themePrimaryColor}</span>
                    </div>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="font-bold text-white/70">Public Page Theme layout</span>
                    <select
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.themeLayout}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, themeLayout: e.target.value }))}
                    >
                      <option value="modern_center">Centered Canvas (Modern)</option>
                      <option value="bold_left">Asymmetrical Big Bold (Left-aligned)</option>
                      <option value="sidebar_checkout">Sidebar Booking (Conversion-focused)</option>
                      <option value="glass_cyber">Glassmorphism Dark (Futuristic neon)</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="font-bold text-white/70">Hero Banner URL</span>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.heroImageUrl}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, heroImageUrl: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="font-bold text-white/70">Highlights (one per line)</span>
                    <textarea
                      rows={2}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                      value={editorDraft.highlights}
                      onChange={(e) => setEditorDraft((d: any) => ({ ...d, highlights: e.target.value }))}
                    />
                  </label>
                </div>

                {/* Social media profile URLs */}
                <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-3">
                  <span className="font-bold text-white/60 block uppercase tracking-wider text-[9px]">Social Profile Links</span>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] text-white/50">Twitter/X Profile URL</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white"
                        value={editorDraft.socialTwitter || ''}
                        onChange={(e) => setEditorDraft((d: any) => ({ ...d, socialTwitter: e.target.value }))}
                        placeholder="https://twitter.com/..."
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-white/50">LinkedIn Page URL</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white"
                        value={editorDraft.socialLinkedin || ''}
                        onChange={(e) => setEditorDraft((d: any) => ({ ...d, socialLinkedin: e.target.value }))}
                        placeholder="https://linkedin.com/company/..."
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-white/50">Discord Invite URL</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white"
                        value={editorDraft.socialDiscord || ''}
                        onChange={(e) => setEditorDraft((d: any) => ({ ...d, socialDiscord: e.target.value }))}
                        placeholder="https://discord.gg/..."
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-white/50">Official Website URL</span>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white"
                        value={editorDraft.socialWebsite || ''}
                        onChange={(e) => setEditorDraft((d: any) => ({ ...d, socialWebsite: e.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Editor Tab: Speakers & Sponsors */}
            {editorTab === 'speakers' && (
              <div className="space-y-4 animate-fade-in text-xs">
                
                {/* Speakers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-extrabold text-white">Event Presenters & Speakers</span>
                    <button type="button" onClick={addDraftSpeaker} className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-1 rounded-lg">
                      + Add speaker
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editorDraft.speakers?.map((s: any) => (
                      <div key={s.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center bg-black/20 p-2.5 rounded-xl relative border border-white/5">
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={s.name}
                          onChange={(e) => updateDraftSpeaker(s.id, { name: e.target.value })}
                          placeholder="Speaker name"
                        />
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={s.role}
                          onChange={(e) => updateDraftSpeaker(s.id, { role: e.target.value })}
                          placeholder="Designation"
                        />
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={s.company}
                          onChange={(e) => updateDraftSpeaker(s.id, { company: e.target.value })}
                          placeholder="Company"
                        />
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={s.avatarUrl}
                          onChange={(e) => updateDraftSpeaker(s.id, { avatarUrl: e.target.value })}
                          placeholder="Photo url"
                        />
                        <button type="button" onClick={() => removeDraftSpeaker(s.id)} className="text-red-400 text-[10px] hover:underline justify-self-center">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sponsors */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-extrabold text-white">Event Sponsors</span>
                    <button type="button" onClick={addDraftSponsor} className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-1 rounded-lg">
                      + Add sponsor
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editorDraft.sponsors?.map((sp: any) => (
                      <div key={sp.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={sp.name}
                          onChange={(e) => updateDraftSponsor(sp.id, { name: e.target.value })}
                          placeholder="Brand name"
                        />
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={sp.logoUrl}
                          onChange={(e) => updateDraftSponsor(sp.id, { logoUrl: e.target.value })}
                          placeholder="Logo url"
                        />
                        <select
                          className="w-full rounded-lg border border-white/10 bg-black px-2.5 py-1.5 text-xs text-white"
                          value={sp.tier}
                          onChange={(e) => updateDraftSponsor(sp.id, { tier: e.target.value })}
                        >
                          <option value="platinum">Platinum</option>
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="bronze">Community</option>
                        </select>
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          value={sp.websiteUrl}
                          onChange={(e) => updateDraftSponsor(sp.id, { websiteUrl: e.target.value })}
                          placeholder="Link url"
                        />
                        <button type="button" onClick={() => removeDraftSponsor(sp.id)} className="text-red-400 text-[10px] hover:underline justify-self-center">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Editor Tab: FAQs */}
            {editorTab === 'faqs' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-extrabold text-white">Doubts Desk & FAQ accordion</span>
                  <button type="button" onClick={addDraftFaq} className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-3 py-1 rounded-lg">
                    + Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {editorDraft.faqs?.map((f: any) => (
                    <div key={f.id} className="p-3 bg-black/20 rounded-xl relative border border-white/5 space-y-2">
                      <button type="button" onClick={() => removeDraftFaq(f.id)} className="absolute right-3 top-3 text-red-400 text-[10px] hover:underline">
                        Remove FAQ
                      </button>
                      <label className="block">
                        <span className="text-white/60">Question</span>
                        <input
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                          value={f.question}
                          onChange={(e) => updateDraftFaq(f.id, { question: e.target.value })}
                          placeholder="doubts..."
                        />
                      </label>
                      <label className="block">
                        <span className="text-white/60">Answer</span>
                        <textarea
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
                          value={f.answer}
                          onChange={(e) => updateDraftFaq(f.id, { answer: e.target.value })}
                          placeholder="description..."
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/5">
                Cancel
              </button>
              <button type="submit" disabled={savingDetails} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-extrabold text-black hover:opacity-90">
                {savingDetails ? 'Saving UI Changes…' : <><Save className="h-4 w-4" /> Publish Custom UI</>}
              </button>
            </div>
          </form>
        )}

        {detailsFeedback && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-600 animate-fade-in">
            {detailsFeedback}
          </div>
        )}

        {/* ─── DYNAMIC LAYOUT TEMPLATES ─── */}

        {/* LAYOUT: MODERN CENTER & GLASS CYBER */}
        {(layoutStyle === 'modern_center' || layoutStyle === 'glass_cyber') && (
          <div className="space-y-6">
            
            {/* Banner Section */}
            {event.heroImageUrl ? (
              <div className={`overflow-hidden rounded-[32px] border relative ${
                layoutStyle === 'glass_cyber' ? 'border-[var(--primary)]/30 shadow-[0_0_50px_rgba(220,179,108,0.15)] bg-black/60' : 'border-[var(--border)] bg-black/20'
              }`}>
                <img src={event.heroImageUrl} alt={event.name} className="h-64 sm:h-80 md:h-96 w-full object-cover select-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-left">
                  {event.badgeLabel && (
                    <span className="inline-flex items-center gap-1 bg-[var(--primary)] text-black text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full mb-3 shadow">
                      <Star className="h-3 w-3 fill-black" />
                      {event.badgeLabel}
                    </span>
                  )}
                  <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-none drop-shadow">{event.name}</h1>
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-[32px] border bg-gradient-to-br from-black to-[var(--primary)]/5 ${
                layoutStyle === 'glass_cyber' ? 'border-[var(--primary)]/20' : 'border-[var(--border)]'
              }`}>
                {event.badgeLabel && (
                  <span className="inline-flex items-center gap-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full mb-3">
                    {event.badgeLabel}
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-white tracking-tight">{event.name}</h1>
              </div>
            )}

            {/* Info Badges Row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[
                { icon: <CalendarDays className="h-4 w-4 text-[var(--primary)]" />, label: 'Schedule date', val: event.startAt ? new Date(event.startAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Schedule pending' },
                { icon: <Clock3 className="h-4 w-4 text-[var(--primary)]" />, label: 'Starts at', val: event.startAt ? new Date(event.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Pending' },
                { icon: <MapPin className="h-4 w-4 text-[var(--primary)]" />, label: 'Venue location', val: event.venue || event.location || 'Online assembly' },
                { icon: <Building2 className="h-4 w-4 text-[var(--primary)]" />, label: 'Organizer', val: event.organizationName || 'Private' }
              ].map((badge, idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl border ${
                  layoutStyle === 'glass_cyber' ? 'border-white/5 bg-white/[0.02] backdrop-blur-xl' : 'border-[var(--border)] bg-black/20'
                }`}>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {badge.icon}
                    <span>{badge.label}</span>
                  </div>
                  <div className="mt-1.5 text-xs sm:text-sm font-extrabold text-white truncate">{badge.val}</div>
                </div>
              ))}
            </div>

            {/* Grid Content: Info Left, Booking Right */}
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
              
              {/* Left Column: Details */}
              <div className="space-y-6">
                
                {/* Description */}
                <div className={`p-6 rounded-3xl border ${
                  layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-white/5 backdrop-blur' : 'bg-black/10 border-[var(--border)]'
                }`}>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 pb-2 mb-3">About Event</h3>
                  <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{event.description || 'No overview text shared yet.'}</p>
                  
                  {/* Social media links right under description */}
                  {(event.socialTwitter || event.socialLinkedin || event.socialDiscord || event.socialWebsite) && (
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/5 mt-4">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Connect:</span>
                      {event.socialTwitter && (
                        <a href={event.socialTwitter} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-[var(--primary)] hover:bg-white/10 transition">
                          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                      )}
                      {event.socialLinkedin && (
                        <a href={event.socialLinkedin} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-[var(--primary)] hover:bg-white/10 transition">
                          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>
                        </a>
                      )}
                      {event.socialDiscord && (
                        <a href={event.socialDiscord} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-[var(--primary)] hover:bg-white/10 transition">
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      )}
                      {event.socialWebsite && (
                        <a href={event.socialWebsite} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-[var(--primary)] hover:bg-white/10 transition">
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Highlights & Includes */}
                {(highlights.length > 0 || includes.length > 0) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {highlights.length > 0 && (
                      <div className={`p-5 rounded-3xl border ${layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-white/5' : 'bg-black/10 border-[var(--border)]'}`}>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Highlights</div>
                        <ul className="space-y-2 text-xs text-white/80">
                          {highlights.map((h: string) => (
                            <li key={h} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {includes.length > 0 && (
                      <div className={`p-5 rounded-3xl border ${layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-white/5' : 'bg-black/10 border-[var(--border)]'}`}>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Includes</div>
                        <ul className="space-y-2 text-xs text-white/80">
                          {includes.map((i: string) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span>{i}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Speakers section */}
                {event.speakers && event.speakers.length > 0 && (
                  <div className={`p-6 rounded-3xl border ${
                    layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-white/5' : 'bg-black/10 border-[var(--border)]'
                  }`}>
                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                      <Users2 className="h-4 w-4 text-[var(--primary)]" />
                      Featured Presenters & Speakers
                    </h4>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      {event.speakers.map((sp: any) => (
                        <div key={sp.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                          {sp.avatarUrl ? (
                            <img src={sp.avatarUrl} alt={sp.name} className="h-12 w-12 rounded-full object-cover shrink-0 border border-white/10" />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--primary)]/25">
                              {sp.name.slice(0,2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">{sp.name}</div>
                            <div className="text-[10px] text-white/50 truncate">{sp.role} {sp.company ? `at ${sp.company}` : ''}</div>
                            
                            {(sp.twitter || sp.linkedin) && (
                              <div className="flex gap-1.5 mt-1">
                                {sp.twitter && <a href={`https://twitter.com/${sp.twitter.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-white/35 hover:text-[var(--primary)]">Twitter</a>}
                                {sp.linkedin && <a href={`https://linkedin.com/in/${sp.linkedin.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-white/35 hover:text-[var(--primary)]">LinkedIn</a>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agenda Items */}
                {agendaItems.length > 0 && (
                  <div className={`p-6 rounded-3xl border ${
                    layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-white/5' : 'bg-black/10 border-[var(--border)]'
                  }`}>
                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[var(--primary)]" />
                      Agenda & Schedule Timeline
                    </h4>
                    
                    <div className="space-y-3">
                      {agendaItems.map((a: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-4">
                          <span className="text-[10px] font-mono text-[var(--primary)] pt-0.5 bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-lg border border-[var(--primary)]/20 shrink-0">
                            Step {idx + 1}
                          </span>
                          <span className="text-xs text-white/80">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQs accordion */}
                {event.faqs && event.faqs.length > 0 && (
                  <div className={`p-6 rounded-3xl border ${
                    layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-white/5' : 'bg-black/10 border-[var(--border)]'
                  }`}>
                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-[var(--primary)]" />
                      Help Desk & Frequently Asked Questions
                    </h4>
                    
                    <div className="space-y-2.5">
                      {event.faqs.map((f: any) => (
                        <details key={f.id} className="group border border-white/5 rounded-2xl bg-black/20 overflow-hidden">
                          <summary className="p-3.5 text-xs font-bold text-white cursor-pointer select-none outline-none flex items-center justify-between hover:bg-white/5 transition">
                            <span>{f.question}</span>
                            <span className="text-[var(--primary)] font-mono transition-transform group-open:rotate-45">+</span>
                          </summary>
                          <p className="px-4 pb-4 text-xs text-white/60 leading-relaxed pt-1.5 border-t border-white/5 bg-black/10">{f.answer}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Checkout Ticket Box */}
              <div className="space-y-6">
                
                {/* Checkout Widget */}
                <div className={`p-6 rounded-3xl border ${
                  layoutStyle === 'glass_cyber' ? 'bg-white/[0.02] border-[var(--primary)]/25 backdrop-blur-xl shadow-xl' : 'bg-black/20 border-[var(--border)]'
                }`}>
                  {/* Form markup */}
                  <CheckoutBoxWidget
                    event={event}
                    tiers={tiers}
                    form={form}
                    setForm={setForm}
                    selectedTierId={selectedTierId}
                    setSelectedTierId={setSelectedTierId}
                    customFields={customFields}
                    answers={answers}
                    setAnswers={setAnswers}
                    consentAccepted={consentAccepted}
                    setConsentAccepted={setConsentAccepted}
                    submitting={submitting}
                    submit={submit}
                    submitError={submitError}
                    successMessage={successMessage}
                    viewerRegistration={viewerRegistration}
                    viewerPaymentLabel={viewerPaymentLabel}
                    isClosed={isClosed}
                    tierTiersEnabled={tierTiersEnabled}
                    remainingSeats={remainingSeats}
                    selectedTierBreakdown={selectedTierBreakdown}
                    selectedTier={selectedTier}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT: BOLD LEFT & SIDEBAR CHECKOUT */}
        {(layoutStyle === 'bold_left' || layoutStyle === 'sidebar_checkout') && (
          <div className={`grid gap-6 ${layoutStyle === 'sidebar_checkout' ? 'lg:grid-cols-[1.15fr_0.85fr]' : 'lg:grid-cols-[0.85fr_1.15fr]'} items-start`}>
            
            {/* Main content Area */}
            <div className="space-y-6 order-2 lg:order-1">
              
              {/* Category tags */}
              <div className="flex flex-wrap items-center gap-2">
                {event.badgeLabel && (
                  <span className="bg-[var(--primary)] text-black text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow">
                    {event.badgeLabel}
                  </span>
                )}
                <span className="border border-[var(--border)] bg-black/40 text-[9px] font-bold text-white/50 uppercase px-2.5 py-1 rounded-full">
                  {event.organizationName || 'Organized'}
                </span>
              </div>

              {/* Title heading */}
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">{event.name}</h1>
              
              {/* Hero Image */}
              {event.heroImageUrl && (
                <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-black/35">
                  <img src={event.heroImageUrl} alt={event.name} className="h-64 sm:h-80 w-full object-cover" />
                </div>
              )}

              {/* About description */}
              <div className="bg-black/20 border border-[var(--border)] rounded-3xl p-5 md:p-6 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">About Experience</h3>
                <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{event.description}</p>
                
                {/* Social media links */}
                {(event.socialTwitter || event.socialLinkedin || event.socialDiscord || event.socialWebsite) && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-white/5 mt-4">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Social:</span>
                    {event.socialTwitter && <a href={event.socialTwitter} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline">Twitter</a>}
                    {event.socialLinkedin && <a href={event.socialLinkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline">LinkedIn</a>}
                    {event.socialDiscord && <a href={event.socialDiscord} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline">Discord</a>}
                    {event.socialWebsite && <a href={event.socialWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline">Website</a>}
                  </div>
                )}
              </div>

              {/* Highlights list */}
              {highlights.length > 0 && (
                <div className="bg-black/20 border border-[var(--border)] p-5 rounded-3xl">
                  <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3">Highlights</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {highlights.map((h: string) => (
                      <div key={h} className="flex items-center gap-2 text-xs text-white/80 bg-black/25 p-2.5 rounded-xl border border-white/5">
                        <Star className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Speakers grid */}
              {event.speakers && event.speakers.length > 0 && (
                <div className="bg-black/20 border border-[var(--border)] p-5 rounded-3xl space-y-4">
                  <div className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Speakers</div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    {event.speakers.map((sp: any) => (
                      <div key={sp.id} className="flex items-center gap-3 bg-black/25 p-3 rounded-2xl border border-white/5">
                        {sp.avatarUrl ? (
                          <img src={sp.avatarUrl} alt={sp.name} className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-xs flex items-center justify-center shrink-0 border border-white/5">
                            {sp.name.slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-white truncate">{sp.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{sp.role} {sp.company ? `at ${sp.company}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agenda timeline */}
              {agendaItems.length > 0 && (
                <div className="bg-black/20 border border-[var(--border)] p-5 rounded-3xl space-y-4">
                  <div className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Agenda</div>
                  <div className="space-y-2 text-xs">
                    {agendaItems.map((a: string, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-black/25 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-mono text-[var(--primary)] bg-[var(--primary)]/15 px-2 py-0.5 rounded border border-white/10">{index + 1}</span>
                        <span className="text-white/80">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ desk */}
              {event.faqs && event.faqs.length > 0 && (
                <div className="bg-black/20 border border-[var(--border)] p-5 rounded-3xl space-y-3">
                  <div className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">FAQ</div>
                  <div className="space-y-2">
                    {event.faqs.map((f: any) => (
                      <div key={f.id} className="p-3 bg-black/25 border border-white/5 rounded-2xl text-xs space-y-1.5">
                        <div className="font-extrabold text-white flex items-center gap-1">
                          <HelpCircle className="h-3.5 w-3.5 text-[var(--primary)]" />
                          {f.question}
                        </div>
                        <div className="text-white/60 leading-relaxed pl-4.5">{f.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Column Area: Sticky Widget */}
            <div className="space-y-6 order-1 lg:order-2 lg:sticky lg:top-4">
              
              {/* Event quick metrics */}
              <div className="bg-black/20 border border-[var(--border)] rounded-3xl p-5 space-y-4 text-xs">
                <h4 className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Event Schedule</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <div className="font-bold text-white">Date</div>
                      <div className="text-white/60">{event.startAt ? new Date(event.startAt).toLocaleDateString() : 'Pending'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <div className="font-bold text-white">Time</div>
                      <div className="text-white/60">{event.startAt ? new Date(event.startAt).toLocaleTimeString() : 'Pending'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <div className="font-bold text-white">Venue</div>
                      <div className="text-white/60">{event.venue || event.location || 'Online assembly'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout Box Widget */}
              <div className="bg-black/20 border border-[var(--border)] rounded-3xl p-5 md:p-6 shadow-xl">
                <CheckoutBoxWidget
                  event={event}
                  tiers={tiers}
                  form={form}
                  setForm={setForm}
                  selectedTierId={selectedTierId}
                  setSelectedTierId={setSelectedTierId}
                  customFields={customFields}
                  answers={answers}
                  setAnswers={setAnswers}
                  consentAccepted={consentAccepted}
                  setConsentAccepted={setConsentAccepted}
                  submitting={submitting}
                  submit={submit}
                  submitError={submitError}
                  successMessage={successMessage}
                  viewerRegistration={viewerRegistration}
                  viewerPaymentLabel={viewerPaymentLabel}
                  isClosed={isClosed}
                  tierTiersEnabled={tierTiersEnabled}
                  remainingSeats={remainingSeats}
                  selectedTierBreakdown={selectedTierBreakdown}
                  selectedTier={selectedTier}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Nested Checkout Widget Component to keep rendering clean
function CheckoutBoxWidget({
  event,
  tiers,
  form,
  setForm,
  selectedTierId,
  setSelectedTierId,
  customFields,
  answers,
  setAnswers,
  consentAccepted,
  setConsentAccepted,
  submitting,
  submit,
  submitError,
  successMessage,
  viewerRegistration,
  viewerPaymentLabel,
  isClosed,
  tierTiersEnabled,
  remainingSeats,
  selectedTierBreakdown,
  selectedTier,
}: any) {
  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 pb-2">
        <Ticket className="h-4 w-4 text-[var(--primary)]" />
        <span>Secure Reservation ticket</span>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
        Fast checkout via Razorpay. Your registration connects directly to the organizer and arrival check-in tools.
      </p>

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-500 font-bold animate-fade-in">
          {successMessage}
        </div>
      )}

      {viewerRegistration && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-white">Your booked pass</span>
            <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              {viewerPaymentLabel || 'Confirmed'}
            </span>
          </div>
          <div className="text-[10px] text-white/50">
            Pass: {tiers.find((t: any) => t.id === viewerRegistration.tierId)?.name || 'General Access'} &bull; Qty {viewerRegistration.qty}
          </div>
        </div>
      )}

      {submitError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-bold animate-fade-in">
          {submitError}
        </div>
      )}

      {isClosed ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <div className="text-xs font-extrabold text-white">Event Concluded</div>
          <p className="text-[10px] text-white/40">Registrations and ticket buying have closed.</p>
        </div>
      ) : tierTiersEnabled && isEventRegistrationOpen(event) ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Select Ticket tier</span>
            <div className="grid gap-2">
              {tiers.map((t: any) => {
                const rem = remainingSeats(t);
                const isSelected = selectedTierId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTierId(t.id)}
                    disabled={rem <= 0}
                    className={`rounded-2xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10 text-white'
                        : 'border-white/10 bg-black/40 hover:bg-white/5 text-white/80'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-extrabold">{t.name}</div>
                        <div className="text-[10px] text-white/40 mt-1">Seats left: {rem}</div>
                      </div>
                      <div className="text-xs font-extrabold text-[var(--primary)]">{formatMoney(event.currency, t.price)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3.5 p-3 bg-black/30 border border-white/5 rounded-2xl mt-3">
            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Selected pass</div>
                <div className="text-xs font-extrabold text-white truncate max-w-[120px]">{selectedTier?.name || 'Select Pass'}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Gross payable</div>
                <div className="text-sm font-extrabold text-[var(--primary)]">{formatCurrency(event.currency, selectedTierBreakdown.grossAmount)}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block">
                <span className="text-[10px] font-bold text-white/60">Full name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Attendee name"
                  required
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-white/60">Email address</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@email.com"
                  type="email"
                  required
                />
              </label>
            </div>

            {/* Custom fields answers */}
            {customFields.length > 0 && (
              <div className="space-y-2.5 pt-2.5 border-t border-white/5 mt-2.5">
                <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block">Additional answers</span>
                {customFields.map((field: any) => {
                  const val = answers[field.id] || '';
                  return (
                    <label key={field.id} className="block text-xs">
                      <span className="text-[10px] text-white/60 font-semibold">
                        {field.label} {field.required ? '*' : ''}
                      </span>
                      
                      {field.type === 'select' ? (
                        <select
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white"
                          value={val}
                          onChange={(e) => setAnswers((p: any) => ({ ...p, [field.id]: e.target.value }))}
                          required={field.required}
                        >
                          <option value="">Select choice</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                          value={val}
                          onChange={(e) => setAnswers((p: any) => ({ ...p, [field.id]: e.target.value }))}
                          required={field.required}
                        />
                      ) : (
                        <input
                          type={field.type}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                          value={val}
                          onChange={(e) => setAnswers((p: any) => ({ ...p, [field.id]: e.target.value }))}
                          required={field.required}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
              <label className="flex items-start gap-2 text-[10px] text-white/50 leading-relaxed cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 accent-[var(--primary)] shrink-0"
                />
                <span>I agree to share contact info with organizer & follow booking rules.</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
              <label className="block">
                <span className="text-[10px] font-bold text-white/60">Tickets Qty</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-center font-bold text-white"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:col-span-2 py-2 rounded-xl bg-[var(--primary)] text-black font-extrabold text-xs hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-1 shadow-lg shadow-[var(--primary)]/10"
              >
                {submitting ? <Clock3 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
                <span>{submitting ? 'Registering...' : 'Confirm Ticket'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/40 text-center">
          {getEventAvailabilityMessage(event)}
        </div>
      )}
    </div>
  );
}
