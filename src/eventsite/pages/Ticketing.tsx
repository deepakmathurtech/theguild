import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Clock3, ExternalLink, Wallet } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useEventPlatformSelection } from '../../context/EventPlatformSelectionContext';
import EventWorkspaceHeader from '../components/EventWorkspaceHeader';
import { canManageEvent } from '../lib/eventAccess';
import { getEventsForHost, getRegistrationsForEvent, requestEventPayout } from '../lib/firestoreEvents';
import type { EventDocument, TicketRegistration, TicketTier } from '../lib/eventModels';
import { calculateCommissionBreakdown, formatCurrency, getEventCommissionPercent } from '../lib/pricing';
import { useActionGuard } from '../lib/useActionGuard';

function getPaymentStatusTone(status?: string) {
  switch (status) {
    case 'paid':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
    case 'pending':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600';
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-500';
    case 'refunded':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-400';
    default:
      return 'border-[var(--border)] bg-[var(--card-subtle)]/40 text-[var(--text-secondary)]';
  }
}

function formatPaymentStatus(status?: string) {
  if (!status) return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Ticketing() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<(TicketRegistration & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingRegistrations, setFetchingRegistrations] = useState(false);
  const [payoutUpdating, setPayoutUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');
  const payoutGuard = useActionGuard({ cooldownMs: 60000, maxAttempts: 1, windowMs: 60000 });

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
        const manageableEvents = list.filter((event) => canManageEvent(event, profile, ownerUid));
        setEvents(manageableEvents);
        if (manageableEvents.length && !selectedEventId) {
          setSelectedEventId(manageableEvents[0].id!);
        }
      } catch (error) {
        console.error('Failed to load org events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid, profile, selectedEventId]);

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
  const isClosed = selectedEvent?.status === 'completed';

  const { setSelectedEventId: publishSelectedEventId, setSelectedEventStatus } = useEventPlatformSelection();

  useEffect(() => {
    if (!selectedEvent) return;
    publishSelectedEventId(selectedEvent.id || '');
    setSelectedEventStatus(selectedEvent.status);
  }, [selectedEvent, publishSelectedEventId, setSelectedEventStatus]);

  const tiers: TicketTier[] = useMemo(() => ((selectedEvent as any)?.ticketTiers || []) as TicketTier[], [selectedEvent]);
  const soldCount = registrations.reduce((sum, registration) => sum + Number(registration.qty || 0), 0);
  const capacity = tiers.reduce((sum, tier) => sum + Number(tier.capacity || 0), 0);
  const remainingSeats = Math.max(0, capacity - soldCount);
  const revenue = registrations.reduce((sum, registration) => {
    const tier = tiers.find((item) => item.id === registration.tierId);
    return sum + Number(tier?.price || 0) * Number(registration.qty || 0);
  }, 0);
  const commission = useMemo(() => calculateCommissionBreakdown(revenue, getEventCommissionPercent(selectedEvent as any)), [revenue, selectedEvent]);
  const paidCount = registrations.filter((registration) => registration.paymentStatus === 'paid').length;
  const pendingCount = registrations.filter((registration) => registration.paymentStatus !== 'paid').length;
  const payoutHistory = useMemo(() => {
    return registrations
      .map((registration) => {
        const tier = tiers.find((item) => item.id === registration.tierId);
        const grossAmount = Number(tier?.price || registration.paymentAmount || 0) * Number(registration.qty || 0);
        const breakdown = calculateCommissionBreakdown(grossAmount, getEventCommissionPercent(selectedEvent as any));
        return {
          ...registration,
          tier,
          grossAmount,
          breakdown,
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [registrations, tiers, selectedEvent]);
  const paidRevenue = payoutHistory.filter((item) => item.paymentStatus === 'paid').reduce((sum, item) => sum + item.grossAmount, 0);
  const pendingRevenue = payoutHistory.filter((item) => item.paymentStatus !== 'paid').reduce((sum, item) => sum + item.grossAmount, 0);
  const payoutReady = payoutHistory.filter((item) => item.paymentStatus === 'paid').reduce((sum, item) => sum + item.breakdown.organizationPayout, 0);
  const failedCount = registrations.filter((registration) => registration.paymentStatus === 'failed').length;
  const refundedCount = registrations.filter((registration) => registration.paymentStatus === 'refunded').length;

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
        note: 'Organizer requested payout settlement for this event.',
      });
      setEvents((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id ? { ...event, payoutStatus: 'requested', payoutRequestedAt: new Date().toISOString() } : event
        )
      );
      setFeedbackTone('success');
      setFeedback('Payout demand submitted successfully and the receptionist has been notified.');
    } catch (error) {
      console.error('Failed to request payout', error);
      payoutGuard.release();
      setFeedbackTone('error');
      setFeedback('Unable to submit the payout request right now. Please try again.');
    } finally {
      setPayoutUpdating(false);
    }
  }

  return (
    <div className="space-y-5">
      <EventWorkspaceHeader
        eyebrow="Sales and settlement"
        title="Ticketing"
        description="Track ticket demand, payment status, payout readiness, and recent buyer activity from one event view."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Tickets sold', value: soldCount, hint: `${remainingSeats} seats remaining` },
          { label: 'Gross revenue', value: formatCurrency(selectedEvent?.currency, revenue), hint: `${paidCount} paid and ${pendingCount} pending` },
        ]}
        aside={
          selectedEvent ? (
            <a
              href={`/event-platform/e/${selectedEvent.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-4 py-3 text-sm font-bold text-[var(--text)] hover:bg-[var(--card-subtle)]/70"
            >
              <ExternalLink className="h-4 w-4" />
              Open public page
            </a>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Capacity</div>
          <div className="mt-2 text-2xl font-extrabold">{capacity}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Net payout</div>
          <div className="mt-2 text-2xl font-extrabold">{formatCurrency(selectedEvent?.currency, commission.organizationPayout)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Guild fee</div>
          <div className="mt-2 text-2xl font-extrabold">{formatCurrency(selectedEvent?.currency, commission.guildFee)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Payout ready</div>
          <div className="mt-2 text-2xl font-extrabold">{formatCurrency(selectedEvent?.currency, payoutReady)}</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Live payout dashboard</div>
              <div className="mt-1 text-sm font-extrabold">Real-time payment mix for this event</div>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
              Live
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Paid bookings</div>
              <div className="mt-1 text-lg font-extrabold">{paidCount}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Pending bookings</div>
              <div className="mt-1 text-lg font-extrabold">{pendingCount}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Remaining seats</div>
              <div className="mt-1 text-lg font-extrabold">{remainingSeats}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getPaymentStatusTone('paid')}`}>{paidCount} paid</span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getPaymentStatusTone('pending')}`}>{pendingCount} pending</span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getPaymentStatusTone('failed')}`}>{failedCount} failed</span>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getPaymentStatusTone('refunded')}`}>{refundedCount} refunded</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Balance view</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2">
              <span>Paid revenue</span>
              <span className="font-extrabold">{formatCurrency(selectedEvent?.currency, paidRevenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2">
              <span>Pending revenue</span>
              <span className="font-extrabold text-[var(--primary)]">{formatCurrency(selectedEvent?.currency, pendingRevenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3 py-2">
              <span>Guild commission</span>
              <span className="font-extrabold text-emerald-500">{formatCurrency(selectedEvent?.currency, revenue - payoutReady)}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-[var(--text-secondary)]">
            Pending, failed, and refunded rows stay visible below so your team can reconcile payment issues before requesting payout.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 text-sm text-[var(--text-secondary)]">
        Guild commission: <span className="font-extrabold text-[var(--primary)]">{commission.commissionPercent}%</span> per ticket sale. The organizer receives{' '}
        <span className="font-extrabold text-emerald-500">{formatCurrency(selectedEvent?.currency, commission.organizationPayout)}</span> from the current sales batch after the fee is applied.
      </div>

      {selectedEvent ? (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Payout workflow</div>
              <div className="mt-1 text-sm font-extrabold">Organizer payout is released after completion or when a payout demand is submitted.</div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                {selectedEvent.payoutStatus === 'requested'
                  ? 'A payout demand is already pending review.'
                  : selectedEvent.payoutStatus === 'ready'
                    ? 'This event is ready for settlement.'
                    : 'You can request settlement now and the receptionist will be notified.'}
              </div>
            </div>
            <div className="rounded-full border border-[var(--primary)]/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              {selectedEvent.payoutStatus || 'pending'}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDemandPayout}
              disabled={payoutUpdating || payoutGuard.isCoolingDown || isClosed || selectedEvent.payoutStatus === 'requested'}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-extrabold text-black transition hover:opacity-95 disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" />
              {payoutUpdating ? 'Submitting...' : payoutGuard.isCoolingDown ? `Wait ${payoutGuard.remainingSeconds}s` : selectedEvent.payoutStatus === 'requested' ? 'Payout requested' : 'Demand payout'}
            </button>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <BellRing className="h-3.5 w-3.5" />
              Receptionist notified on demand
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {selectedEvent.payoutRequestedAt ? `Requested ${new Date(selectedEvent.payoutRequestedAt).toLocaleString()}` : 'No payout request yet'}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {selectedEvent.status === 'completed' ? 'Completion status already enables payout settlement' : 'Mark the event completed to unlock payout readiness'}
            </span>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            feedbackTone === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
              : 'border-red-500/20 bg-red-500/10 text-red-500'
          }`}
          role={feedbackTone === 'error' ? 'alert' : 'status'}
        >
          {feedback}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Registrations</div>
            <div className="mt-2 text-sm font-extrabold">{selectedEvent ? `Live purchases for ${selectedEvent.name}` : 'Select an event to see sales'}</div>
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Remaining seats: {remainingSeats}</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading || fetchingRegistrations ? (
            <div className="text-sm text-[var(--text-secondary)]">Loading registrations...</div>
          ) : payoutHistory.length ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)]">
                  <th className="py-2">Buyer</th>
                  <th className="py-2">Tier</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Gross</th>
                  <th className="py-2">Guild fee</th>
                  <th className="py-2">Payout</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.map((registration) => (
                  <tr key={registration.id} className="border-t border-[var(--border)]">
                    <td className="py-3">
                      <div className="font-semibold">{registration.fullName}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">{registration.email}</div>
                    </td>
                    <td className="py-3">{registration.tier?.name || registration.tierId}</td>
                    <td className="py-3">{registration.qty}</td>
                    <td className="py-3">{formatCurrency(selectedEvent?.currency, registration.grossAmount)}</td>
                    <td className="py-3 text-[var(--primary)]">{formatCurrency(selectedEvent?.currency, registration.breakdown.guildFee)}</td>
                    <td className="py-3 text-emerald-500">{formatCurrency(selectedEvent?.currency, registration.breakdown.organizationPayout)}</td>
                    <td className="py-3 text-[var(--text-secondary)]">
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${getPaymentStatusTone(registration.paymentStatus)}`}>
                        {formatPaymentStatus(registration.paymentStatus)}
                      </div>
                      <div className="text-[10px]">{registration.createdAt ? new Date(registration.createdAt).toLocaleString() : 'Recorded'}</div>
                    </td>
                  </tr>
                ))}
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
