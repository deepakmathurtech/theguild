import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  BellRing, 
  CheckCircle2, 
  Clock3, 
  Copy, 
  ExternalLink, 
  Ticket, 
  Users, 
  Wallet,
  Plus,
  Trash2,
  Palette,
  Globe,
  HelpCircle,
  Users2,
  Calendar,
  MapPin,
  Sparkles,
  Mail,
  Sliders,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
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

interface SpeakerDraft {
  id: string;
  name: string;
  role: string;
  company?: string;
  bio?: string;
  avatarUrl?: string;
  twitter?: string;
  linkedin?: string;
}

interface SponsorDraft {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
}

interface FaqDraft {
  id: string;
  question: string;
  answer: string;
}

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

  // Creation tab switcher state
  const [activeMakerTab, setActiveMakerTab] = useState<'basics' | 'tickets' | 'theme' | 'speakers' | 'faqs'>('basics');

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
    themePrimaryColor: '#dcb36c',
    themeLayout: 'modern_center' as EventDocument['themeLayout'],
    socialTwitter: '',
    socialLinkedin: '',
    socialDiscord: '',
    socialWebsite: '',
    speakers: [] as SpeakerDraft[],
    sponsors: [] as SponsorDraft[],
    faqs: [] as FaqDraft[],
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
        themePrimaryColor: form.themePrimaryColor,
        themeLayout: form.themeLayout,
        socialTwitter: form.socialTwitter,
        socialLinkedin: form.socialLinkedin,
        socialDiscord: form.socialDiscord,
        socialWebsite: form.socialWebsite,
        speakers: form.speakers,
        sponsors: form.sponsors,
        faqs: form.faqs,
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

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);

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

  // Speakers helpers
  const addSpeaker = () => {
    const newSpeaker: SpeakerDraft = {
      id: `sp-${Date.now()}`,
      name: '',
      role: '',
      company: '',
      bio: '',
      avatarUrl: '',
      twitter: '',
      linkedin: ''
    };
    setForm(p => ({ ...p, speakers: [...p.speakers, newSpeaker] }));
  };

  const removeSpeaker = (id: string) => {
    setForm(p => ({ ...p, speakers: p.speakers.filter(s => s.id !== id) }));
  };

  const updateSpeaker = (id: string, fields: Partial<SpeakerDraft>) => {
    setForm(p => ({
      ...p,
      speakers: p.speakers.map(s => s.id === id ? { ...s, ...fields } : s)
    }));
  };

  // Sponsors helpers
  const addSponsor = () => {
    const newSponsor: SponsorDraft = {
      id: `spon-${Date.now()}`,
      name: '',
      logoUrl: '',
      websiteUrl: '',
      tier: 'gold'
    };
    setForm(p => ({ ...p, sponsors: [...p.sponsors, newSponsor] }));
  };

  const removeSponsor = (id: string) => {
    setForm(p => ({ ...p, sponsors: p.sponsors.filter(sp => sp.id !== id) }));
  };

  const updateSponsor = (id: string, fields: Partial<SponsorDraft>) => {
    setForm(p => ({
      ...p,
      sponsors: p.sponsors.map(sp => sp.id === id ? { ...sp, ...fields } : sp)
    }));
  };

  // FAQs helpers
  const addFaq = () => {
    const newFaq: FaqDraft = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: ''
    };
    setForm(p => ({ ...p, faqs: [...p.faqs, newFaq] }));
  };

  const removeFaq = (id: string) => {
    setForm(p => ({ ...p, faqs: p.faqs.filter(f => f.id !== id) }));
  };

  const updateFaq = (id: string, fields: Partial<FaqDraft>) => {
    setForm(p => ({
      ...p,
      faqs: p.faqs.map(f => f.id === id ? { ...f, ...fields } : f)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[var(--primary)] animate-pulse" />
            Event Maker & Portal
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5">
            Design highly customized public pages, structure speakers, sponsors, FAQs, and configure Razorpay ticket gates.
          </p>
        </div>
      </div>

      {!loading && !canCreateEvents ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 text-sm text-[var(--text-secondary)] flex items-start gap-2.5">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <span>Only organization representatives and organization accounts can create events. Connect your organization profile to unlock the maker experience.</span>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border p-4 text-sm animate-fade-in ${
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 shadow-xl overflow-hidden">
          {/* Form Tabs */}
          <div className="flex items-center gap-1 bg-[var(--card-subtle)]/30 border-b border-[var(--border)] p-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'basics' as const, label: '1. Basics & Details', icon: <Calendar className="h-4 w-4" /> },
              { id: 'tickets' as const, label: '2. Tickets & Forms', icon: <Ticket className="h-4 w-4" /> },
              { id: 'theme' as const, label: '3. Style & Layout', icon: <Palette className="h-4 w-4" /> },
              { id: 'speakers' as const, label: '4. Speakers & Sponsors', icon: <Users2 className="h-4 w-4" /> },
              { id: 'faqs' as const, label: '5. FAQ Board', icon: <HelpCircle className="h-4 w-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMakerTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  activeMakerTab === tab.id
                    ? 'bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/20'
                    : 'text-[var(--text-muted)] hover:bg-[var(--card-subtle)]/60 hover:text-[var(--text-secondary)]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-4 md:p-6 space-y-6">
            
            {/* Tab: Basics */}
            {activeMakerTab === 'basics' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Event Name</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.slice(0, 90) }))}
                      placeholder="e.g., Annual DevSummit 2026"
                      required
                      minLength={3}
                      maxLength={90}
                    />
                  </label>

                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Slug / URL path</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none"
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: sanitizeSlug(e.target.value).slice(0, 80) }))}
                      placeholder="e.g., devsummit-2026"
                      maxLength={80}
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="text-xs font-bold text-[var(--text-secondary)]">Description / About (Markdown supported)</div>
                  <textarea
                    className="mt-1.5 w-full min-h-[120px] rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value.slice(0, 1800) }))}
                    placeholder="Provide a compelling overview of the event, what will happen, and why people should attend."
                    maxLength={1800}
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Venue</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.venue}
                      onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                      placeholder="e.g., Grand Auditorium, Building B"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Location</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.location}
                      onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g., Bangalore, India (or Online)"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Start date & time</div>
                    <div className="mt-1.5 grid grid-cols-2 gap-3">
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
                    <div className="text-xs font-bold text-[var(--text-secondary)]">End date & time</div>
                    <div className="mt-1.5 grid grid-cols-2 gap-3">
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
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
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
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
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
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.currency}
                      onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) }))}
                      placeholder="INR"
                      maxLength={3}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Organizer bio</div>
                    <textarea
                      className="mt-1.5 w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.organizerBio}
                      onChange={(e) => setForm((p) => ({ ...p, organizerBio: e.target.value }))}
                      placeholder="Share a short bio of the hosting organization."
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Contact email</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.contactEmail}
                      onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value.trim().slice(0, 120) }))}
                      placeholder="hello@yourorg.com"
                      type="email"
                      maxLength={120}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMakerTab('tickets')}
                  className="mt-4 flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-black text-xs font-extrabold shadow hover:opacity-90 transition self-end ml-auto"
                >
                  <span>Continue to Tickets</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Tab: Tickets */}
            {activeMakerTab === 'tickets' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ticketTiersEnabled"
                    checked={form.ticketTiersEnabled}
                    onChange={(e) => setForm((p) => ({ ...p, ticketTiersEnabled: e.target.checked }))}
                    className="accent-[var(--primary)] h-4 w-4"
                  />
                  <label htmlFor="ticketTiersEnabled" className="text-sm font-extrabold cursor-pointer">
                    Enable ticket tiers & gate registration
                  </label>
                </div>

                {form.ticketTiersEnabled ? (
                  <div className="border border-[var(--border)] rounded-2xl p-4 bg-black/10 space-y-4">
                    <div className="text-xs font-extrabold text-[var(--text-muted)] tracking-wider uppercase">Configure Pricing Tiers</div>
                    
                    <div className="space-y-3">
                      {form.tiers.map((t, idx) => (
                        <div key={t.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-black/20 p-3 rounded-xl border border-white/5">
                          <label className="block md:col-span-2">
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Pass Name</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-semibold"
                              value={t.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm((p) => ({ ...p, tiers: p.tiers.map((x, i) => (i === idx ? { ...x, name: val } : x)) }));
                              }}
                            />
                          </label>

                          <label className="block">
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Price ({form.currency})</div>
                            <input
                              type="number"
                              min={0}
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-mono"
                              value={t.price}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setForm((p) => ({ ...p, tiers: p.tiers.map((x, i) => (i === idx ? { ...x, price: val } : x)) }));
                              }}
                            />
                          </label>

                          <label className="block">
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Capacity</div>
                            <input
                              type="number"
                              min={1}
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-mono"
                              value={t.capacity}
                              onChange={(e) => {
                                const val = Math.max(1, Math.floor(Number(e.target.value)));
                                setForm((p) => ({ ...p, tiers: p.tiers.map((x, i) => (i === idx ? { ...x, capacity: val } : x)) }));
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, tiers: p.tiers.filter((_, i) => i !== idx) }))}
                            className="w-full py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold border border-red-500/25 transition"
                            disabled={form.tiers.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, tiers: [...p.tiers, { id: `tier-${Date.now()}`, name: `Tier ${p.tiers.length + 1}`, price: 100, capacity: 100 }] }))}
                      className="w-full border border-[var(--border)] rounded-xl py-2 text-xs font-extrabold text-[var(--text-secondary)] hover:bg-white/5 transition"
                    >
                      + Add Ticket Tier
                    </button>
                  </div>
                ) : null}

                {/* Question fields */}
                <div className="border border-[var(--border)] rounded-2xl p-4 bg-black/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-[var(--text-muted)] tracking-wider uppercase">Registration Form Fields</div>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, questions: [...p.questions, { id: `q-${Date.now()}`, label: '', type: 'text', required: false, optionsText: '' }] }))}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-white/5 text-xs font-bold text-[var(--text-secondary)] transition"
                    >
                      + Add Custom Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.questions.map((question, idx) => (
                      <div key={question.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
                          <label className="block">
                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Field Label</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs"
                              value={question.label}
                              onChange={(e) => setForm(p => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, label: e.target.value } : q)) }))}
                              placeholder="e.g. Diet requirements, T-Shirt Size"
                              required
                            />
                          </label>

                          <label className="block">
                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Field Type</div>
                            <select
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs"
                              value={question.type}
                              onChange={(e) => setForm(p => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, type: e.target.value as any } : q)) }))}
                            >
                              <option value="text">Text Input</option>
                              <option value="email">Email Address</option>
                              <option value="number">Number</option>
                              <option value="textarea">Paragraph Block</option>
                              <option value="select">Dropdown Menu</option>
                            </select>
                          </label>

                          <label className="flex items-center gap-2 border border-[var(--border)] bg-black/35 rounded-xl px-3 py-2 mt-4 text-xs font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => setForm(p => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, required: e.target.checked } : q)) }))}
                              className="accent-[var(--primary)]"
                            />
                            <span>Required field</span>
                          </label>
                        </div>

                        {question.type === 'select' && (
                          <label className="block mt-2">
                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Dropdown Options (one per line)</div>
                            <textarea
                              rows={2}
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-mono"
                              value={question.optionsText}
                              onChange={(e) => setForm(p => ({ ...p, questions: p.questions.map((q, i) => (i === idx ? { ...q, optionsText: e.target.value } : q)) }))}
                              placeholder="Option A&#10;Option B&#10;Option C"
                            />
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }))}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 transition"
                        >
                          Delete field
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button type="button" onClick={() => setActiveMakerTab('basics')} className="px-4 py-2 border border-[var(--border)] text-xs font-bold rounded-xl hover:bg-white/5 transition">
                    Back
                  </button>
                  <button type="button" onClick={() => setActiveMakerTab('theme')} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-black text-xs font-extrabold hover:opacity-90 transition">
                    <span>Continue to Styling</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Styling & Theme */}
            {activeMakerTab === 'theme' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Hero Banner Image URL</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.heroImageUrl}
                      onChange={(e) => setForm((p) => ({ ...p, heroImageUrl: e.target.value.trim() }))}
                      placeholder="https://..."
                    />
                  </label>

                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Category Tag / Badge label</div>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-sm"
                      value={form.badgeLabel}
                      onChange={(e) => setForm((p) => ({ ...p, badgeLabel: e.target.value }))}
                      placeholder="Featured community meetup"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[var(--border)] rounded-2xl p-4 bg-black/10">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Brand Primary color</div>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={form.themePrimaryColor}
                        onChange={(e) => setForm(p => ({ ...p, themePrimaryColor: e.target.value }))}
                        className="w-10 h-10 border border-white/10 rounded cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={form.themePrimaryColor}
                        onChange={(e) => setForm(p => ({ ...p, themePrimaryColor: e.target.value }))}
                        className="bg-transparent border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-center w-28 text-white/70"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Public Page Layout Template</div>
                    <select
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                      value={form.themeLayout}
                      onChange={(e) => setForm(p => ({ ...p, themeLayout: e.target.value as any }))}
                    >
                      <option value="modern_center">Centered Canvas (Modern)</option>
                      <option value="bold_left">Asymmetrical Big Bold (Left-aligned)</option>
                      <option value="sidebar_checkout">Sidebar Booking (Conversion-focused)</option>
                      <option value="glass_cyber">Glassmorphism Dark (Futuristic neon)</option>
                    </select>
                  </label>
                </div>

                {/* Social media links */}
                <div className="border border-[var(--border)] rounded-2xl p-4 bg-black/10 space-y-3">
                  <div className="text-xs font-extrabold text-[var(--text-muted)] tracking-wider uppercase">Social Accounts & Contact Details</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <label className="block">
                      <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Twitter Profile URL</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                        value={form.socialTwitter}
                        onChange={(e) => setForm(p => ({ ...p, socialTwitter: e.target.value }))}
                        placeholder="https://twitter.com/..."
                      />
                    </label>

                    <label className="block">
                      <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">LinkedIn Page URL</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                        value={form.socialLinkedin}
                        onChange={(e) => setForm(p => ({ ...p, socialLinkedin: e.target.value }))}
                        placeholder="https://linkedin.com/company/..."
                      />
                    </label>

                    <label className="block">
                      <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Discord Invite URL</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                        value={form.socialDiscord}
                        onChange={(e) => setForm(p => ({ ...p, socialDiscord: e.target.value }))}
                        placeholder="https://discord.gg/..."
                      />
                    </label>

                    <label className="block">
                      <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Official Website URL</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2"
                        value={form.socialWebsite}
                        onChange={(e) => setForm(p => ({ ...p, socialWebsite: e.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[var(--border)] rounded-2xl p-4 bg-black/10">
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Highlights / Takeaways (one per line)</div>
                    <textarea
                      rows={2}
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs"
                      value={form.highlights}
                      onChange={(e) => setForm((p) => ({ ...p, highlights: e.target.value }))}
                      placeholder="✓ Certified training&#10;✓ Direct networking&#10;✓ Q&A forums"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">Includes / Perks (one per line)</div>
                    <textarea
                      rows={2}
                      className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs"
                      value={form.includes}
                      onChange={(e) => setForm((p) => ({ ...p, includes: e.target.value }))}
                      placeholder="Lunch and snacks&#10;Stickers & swag pack&#10;Verified digital badge"
                    />
                  </label>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button type="button" onClick={() => setActiveMakerTab('tickets')} className="px-4 py-2 border border-[var(--border)] text-xs font-bold rounded-xl hover:bg-white/5 transition">
                    Back
                  </button>
                  <button type="button" onClick={() => setActiveMakerTab('speakers')} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-black text-xs font-extrabold hover:opacity-90 transition">
                    <span>Continue to Speakers</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Speakers & Sponsors */}
            {activeMakerTab === 'speakers' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Speakers board */}
                <div className="border border-[var(--border)] rounded-2xl p-4 bg-black/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-[var(--text-muted)] tracking-wider uppercase">Speakers & Presenters</div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Showcase your experts and presenters on the page.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addSpeaker}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold hover:bg-white/5 transition text-[var(--text-secondary)]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add speaker
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.speakers.map(s => (
                      <div key={s.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => removeSpeaker(s.id)}
                          className="absolute right-3 top-3 p-1 rounded hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <label className="block">
                            <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Speaker Name</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold"
                              value={s.name}
                              onChange={(e) => updateSpeaker(s.id, { name: e.target.value })}
                              placeholder="Dr. Jordan Miller"
                              required
                            />
                          </label>

                          <label className="block">
                            <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Role / Designation</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                              value={s.role}
                              onChange={(e) => updateSpeaker(s.id, { role: e.target.value })}
                              placeholder="Lead AI Architect"
                            />
                          </label>

                          <label className="block">
                            <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Company / Brand</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                              value={s.company}
                              onChange={(e) => updateSpeaker(s.id, { company: e.target.value })}
                              placeholder="Google DeepMind"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <label className="block md:col-span-2">
                            <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Avatar Photo URL</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                              value={s.avatarUrl}
                              onChange={(e) => updateSpeaker(s.id, { avatarUrl: e.target.value })}
                              placeholder="https://..."
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                              <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Twitter</div>
                              <input
                                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                                value={s.twitter}
                                onChange={(e) => updateSpeaker(s.id, { twitter: e.target.value })}
                                placeholder="@username"
                              />
                            </label>
                            <label className="block">
                              <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">LinkedIn</div>
                              <input
                                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                                value={s.linkedin}
                                onChange={(e) => updateSpeaker(s.id, { linkedin: e.target.value })}
                                placeholder="@username"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    {form.speakers.length === 0 && (
                      <div className="text-center py-6 text-xs text-[var(--text-muted)] border border-dashed border-white/5 rounded-xl">
                        No speakers added yet. Show who is presenting!
                      </div>
                    )}
                  </div>
                </div>

                {/* Sponsors board */}
                <div className="border border-[var(--border)] rounded-2xl p-4 bg-black/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-[var(--text-muted)] tracking-wider uppercase">Sponsors & Partners</div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Place brand logo banners to thank your sponsors.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addSponsor}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold hover:bg-white/5 transition text-[var(--text-secondary)]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add sponsor
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.sponsors.map(sp => (
                      <div key={sp.id} className="p-3 bg-black/20 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end relative">
                        <button
                          type="button"
                          onClick={() => removeSponsor(sp.id)}
                          className="absolute right-3 top-3 p-1 rounded hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <label className="block md:col-span-2">
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Sponsor Brand Name</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold"
                            value={sp.name}
                            onChange={(e) => updateSponsor(sp.id, { name: e.target.value })}
                            placeholder="e.g. GitHub"
                            required
                          />
                        </label>

                        <label className="block">
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Logo Image URL</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                            value={sp.logoUrl}
                            onChange={(e) => updateSponsor(sp.id, { logoUrl: e.target.value })}
                            placeholder="https://..."
                          />
                        </label>

                        <label className="block">
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Website URL</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs"
                            value={sp.websiteUrl}
                            onChange={(e) => updateSponsor(sp.id, { websiteUrl: e.target.value })}
                            placeholder="https://..."
                          />
                        </label>

                        <label className="block">
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Sponsorship Tier</div>
                          <select
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs"
                            value={sp.tier}
                            onChange={(e) => updateSponsor(sp.id, { tier: e.target.value as any })}
                          >
                            <option value="platinum">Platinum Partner</option>
                            <option value="gold">Gold Sponsor</option>
                            <option value="silver">Silver Sponsor</option>
                            <option value="bronze">Community Partner</option>
                          </select>
                        </label>
                      </div>
                    ))}

                    {form.sponsors.length === 0 && (
                      <div className="text-center py-6 text-xs text-[var(--text-muted)] border border-dashed border-white/5 rounded-xl">
                        No partners added yet. Let’s support sponsorship!
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button type="button" onClick={() => setActiveMakerTab('theme')} className="px-4 py-2 border border-[var(--border)] text-xs font-bold rounded-xl hover:bg-white/5 transition">
                    Back
                  </button>
                  <button type="button" onClick={() => setActiveMakerTab('faqs')} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-black text-xs font-extrabold hover:opacity-90 transition">
                    <span>Continue to FAQs</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab: FAQ Board */}
            {activeMakerTab === 'faqs' && (
              <div className="space-y-4 animate-fade-in">
                <div className="border border-[var(--border)] rounded-2xl p-4 bg-black/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-[var(--text-muted)] tracking-wider uppercase">Event Q&A Desk (FAQs)</div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Answer common doubts like refund terms, parking, access, food etc.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addFaq}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold hover:bg-white/5 transition text-[var(--text-secondary)]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add FAQ
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.faqs.map(f => (
                      <div key={f.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => removeFaq(f.id)}
                          className="absolute right-3 top-3 p-1 rounded hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <label className="block">
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Question</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-semibold"
                            value={f.question}
                            onChange={(e) => updateFaq(f.id, { question: e.target.value })}
                            placeholder="e.g. Is there parking at the venue?"
                            required
                          />
                        </label>

                        <label className="block">
                          <div className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Answer</div>
                          <textarea
                            rows={2}
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs"
                            value={f.answer}
                            onChange={(e) => updateFaq(f.id, { answer: e.target.value })}
                            placeholder="e.g. Yes, free parking is available behind Building B. Validate your pass at reception."
                            required
                          />
                        </label>
                      </div>
                    ))}

                    {form.faqs.length === 0 && (
                      <div className="text-center py-6 text-xs text-[var(--text-muted)] border border-dashed border-white/5 rounded-xl">
                        No FAQs added yet. Clear up attendee doubts easily.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button type="button" onClick={() => setActiveMakerTab('speakers')} className="px-4 py-2 border border-[var(--border)] text-xs font-bold rounded-xl hover:bg-white/5 transition">
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy || createGuard.isCoolingDown || loading || !ownerUid || !canCreateEvents}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--primary)] text-black text-sm font-extrabold hover:opacity-95 active:scale-95 transition"
                  >
                    <span>{busy ? 'Creating Event...' : 'Launch & Publish Event'}</span>
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      ) : null}

      {/* Organizer Console: Your events list */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Your events</div>
          <a
            href="/event-platform/history"
            className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 transition"
          >
            View history archive
          </a>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {events.length ? (
            events.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedEventId(e.id || null)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  selectedEventId === e.id 
                    ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/20' 
                    : 'border-[var(--border)] bg-[var(--card-subtle)]/30 hover:bg-[var(--card-subtle)]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">{e.name}</div>
                    <div className="mt-1.5 text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      <span>{e.startAt ? new Date(e.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Schedule pending'}</span>
                    </div>
                  </div>
                  <div className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--primary)] shrink-0">
                    {e.status || 'draft'}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Ticket className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {e.ticketTiersEnabled ? 'Tickets online' : 'Free RSVP'}
                  </span>
                  {e.themeLayout && (
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                      {e.themeLayout.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-xs text-[var(--text-secondary)] py-4">No events created yet. Use the wizard above to build your first event.</div>
          )}
        </div>
      </div>

      {/* Event detail insights panel */}
      {selectedEvent && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Registration insights</div>
              <div className="mt-1 text-sm font-extrabold text-white">{selectedEvent.name}</div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const guardMessage = shareGuard.guardAction('Copy action is cooling down.');
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
                  }
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 transition"
              >
                {shareCopied ? 'Copied ✓' : 'Copy link'}
              </button>
              
              <button
                type="button"
                onClick={() => handleStatusChange(selectedEvent?.status === 'completed' ? 'published' : 'completed')}
                disabled={statusUpdating || statusGuard.isCoolingDown}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 transition"
              >
                {selectedEvent?.status === 'completed' ? 'Re-open' : 'Complete Event'}
              </button>
              
              <a
                href={`/event-platform/e/${selectedEvent.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/70 transition flex items-center gap-1.5"
              >
                <span>Preview page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Tickets sold</span>
              <span className="mt-1 text-2xl font-extrabold text-white">{summary.sold} / {summary.capacity}</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Revenue</span>
              <span className="mt-1 text-2xl font-extrabold text-white">{formatCurrency((selectedEvent as any)?.currency, summary.commission.grossAmount)}</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Net Payout</span>
              <span className="mt-1 text-2xl font-extrabold text-emerald-400">{formatCurrency((selectedEvent as any)?.currency, summary.commission.organizationPayout)}</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Payout status</span>
              <span className="mt-1 text-xs font-extrabold uppercase bg-white/5 py-1 px-2.5 rounded self-start tracking-wider text-[var(--primary)]">{selectedEvent.payoutStatus || 'pending'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Payout Settlement release</div>
                <div className="mt-1 text-sm font-extrabold">Release payouts directly after event ends or demand a review.</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={handleDemandPayout}
                disabled={payoutUpdating || payoutGuard.isCoolingDown || selectedEvent.payoutStatus === 'requested'}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-extrabold text-black transition hover:opacity-95 disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />
                {payoutUpdating ? 'Requesting...' : selectedEvent.payoutStatus === 'requested' ? 'Payout requested' : 'Demand settlement payout'}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedEvent?.status === 'completed' ? 'published' : 'completed')}
                disabled={statusUpdating || statusGuard.isCoolingDown}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2.5 text-sm font-extrabold text-[var(--text-secondary)] transition hover:bg-[var(--card-subtle)]/70 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {selectedEvent?.status === 'completed' ? 'Re-open Event' : 'Mark Completed & Ready'}
              </button>
            </div>
          </div>

          {/* Registrations list */}
          <div className="border border-[var(--border)] rounded-xl bg-black/10 p-3">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <Users className="h-4 w-4 text-[var(--primary)]" />
              <span>Registered Attendees list ({registrations.length})</span>
            </div>

            {loadingRegistrations ? (
              <div className="text-xs text-[var(--text-muted)] py-4">Loading attendee records...</div>
            ) : registrations.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Tier</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2 text-right">Form Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {registrations.map(r => (
                      <tr key={r.id}>
                        <td className="py-2.5 font-bold text-white">{r.fullName}</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">{r.email}</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">{r.tierId}</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">{r.qty}</td>
                        <td className="py-2.5 text-right">
                          {selectedEvent.registrationFormFields?.length ? (
                            <details className="text-xs text-left">
                              <summary className="cursor-pointer text-[var(--primary)] font-bold text-[10px] select-none outline-none">Answers</summary>
                              <div className="mt-1 space-y-1 bg-black/30 p-2 rounded border border-white/5">
                                {Object.entries(r.answers || {}).map(([fId, val]) => {
                                  const label = selectedEvent.registrationFormFields?.find(field => field.id === fId)?.label || fId;
                                  return (
                                    <div key={fId} className="text-[9px]">
                                      <span className="text-[var(--text-muted)] font-bold">{label}: </span>
                                      <span className="text-white/80">{val}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          ) : <span className="text-[10px] text-white/20">None</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">No registrations for this event yet. Share the link!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
