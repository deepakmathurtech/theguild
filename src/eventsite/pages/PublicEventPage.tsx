import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Clock3, MapPin, Sparkles, Ticket, CheckCircle2 } from 'lucide-react';
import { getEventBySlug, getRegistrationsForEvent, registerForEvent } from '../lib/firestoreEvents';
import type { EventRegistrationField, TicketTier } from '../lib/eventModels';

function getApiBase() {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return '';
  }
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

export default function PublicEventPage() {
  const { slug } = useParams();
  const eventSlug = slug || '';

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tierTiersEnabled, setTierTiersEnabled] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [regs, setRegs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<{ fullName: string; email: string; qty: number }>({ fullName: '', email: '', qty: 1 });

  const customFields = useMemo(() => ((event as any)?.registrationFormFields || []) as EventRegistrationField[], [event]);

  const tiers: TicketTier[] = useMemo(() => {
    if (!event) return [];
    return ((event as any).ticketTiers || []) as TicketTier[];
  }, [event]);


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
    if (!form.fullName.trim() || !form.email.trim() || !selectedTierId) return;

    for (const field of customFields) {
      if (field.required && !String(answers[field.id] || '').trim()) {
        setSubmitError(`${field.label} is required.`);
        return;
      }
    }

    const selectedTier = tiers.find((tier) => tier.id === selectedTierId);
    const qty = Math.max(1, Number(form.qty) || 1);
    const amount = (selectedTier?.price || 0) * qty;
    const currency = (event as any)?.currency || 'INR';

    const completeRegistration = async (paymentStatus: 'paid' | 'pending', paymentId?: string, orderId?: string) => {
      const created = await registerForEvent({
        eventId: event.id,
        tierId: selectedTierId,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        qty,
        answers,
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
      if (created?.tierId) setSelectedTierId(created.tierId);
      setSuccessMessage(
        paymentStatus === 'paid'
          ? `Ticket reserved successfully for ${form.fullName.trim()}. Your payment is recorded and the organizer can see the booking.`
          : `Ticket request saved for ${form.fullName.trim()}. Payment is still pending.`
      );
    };

    const verifyWithServer = async (response: any, resolvedOrderId: string) => {
      const verifyRes = await fetch(`${getApiBase()}/verify-razorpay-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedTierId,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
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
      const verifyData = verifyText ? (() => { try { return JSON.parse(verifyText); } catch { return null; } })() : null;
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
          body: JSON.stringify({ amount: amount * 100, currency }),
        });

        const text = await orderRes.text();
        const orderData = text ? (() => {
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        })() : null;

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
          description: `${selectedTier?.name || 'Ticket'} for ${event.name}`,
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
            name: form.fullName.trim(),
            email: form.email.trim(),
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
      setSubmitError(err?.message ? String(err.message) : 'Registration failed.');
    } finally {
      setSubmitting(false);
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
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card-subtle)]/20 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-subtle)]/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              {event.organizationName || 'Organized event'}
            </div>
            <h1 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight">{event.name}</h1>
            {event.description ? (
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{event.description}</p>
            ) : null}

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
                  <div className="mt-2 text-sm font-semibold">{new Date(event.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              ) : null}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <MapPin className="h-3.5 w-3.5" />
                  Venue
                </div>
                <div className="mt-2 text-sm font-semibold">{event.organizationName || 'Online / Private'}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--card-subtle)]/50 p-6 md:p-8 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
              <Ticket className="h-4 w-4" />
              Secure ticket checkout
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Fast, secure payments via Razorpay and instant booking confirmation for the organizer.
            </p>

            {successMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </div>
              </div>
            ) : null}

            {submitError ? (
              <div className="mt-4 rounded-2xl border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{submitError}</div>
            ) : null}

            {tierTiersEnabled ? (
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
                        <div className="text-xs text-[var(--text-secondary)] mt-2">
                          {formatMoney((event as any).currency, t.price)}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-2">Remaining: {remaining}</div>
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={submit} className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="block md:col-span-2">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Full name</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={form.fullName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: { fullName: string; email: string; qty: number }) => ({ ...p, fullName: e.target.value }))}
                        placeholder="Your name"
                        required
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs font-bold text-[var(--text-secondary)]">Email</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                        value={form.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: { fullName: string; email: string; qty: number }) => ({ ...p, email: e.target.value }))}
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
                                  {field.options?.map((option: string) => (
                                    <option key={option} value={option}>{option}</option>
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
              <div className="mt-6 text-xs text-[var(--text-secondary)]">Ticketing is disabled for this event.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

