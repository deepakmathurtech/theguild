import React, { useEffect, useMemo, useState } from 'react';
import { 
  BellRing, 
  CheckCircle2, 
  Clock3, 
  ExternalLink, 
  Wallet, 
  Search, 
  X, 
  Filter, 
  Ticket, 
  Info,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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
  
  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

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

  // Feedback timer
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

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
  const pendingCount = registrations.filter((registration) => registration.paymentStatus === 'pending').length;
  const failedCount = registrations.filter((registration) => registration.paymentStatus === 'failed').length;
  const refundedCount = registrations.filter((registration) => registration.paymentStatus === 'refunded').length;

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
  const pendingRevenue = payoutHistory.filter((item) => item.paymentStatus === 'pending').reduce((sum, item) => sum + item.grossAmount, 0);
  const payoutReady = payoutHistory.filter((item) => item.paymentStatus === 'paid').reduce((sum, item) => sum + item.breakdown.organizationPayout, 0);

  // Apply filters
  const filteredPayoutHistory = useMemo(() => {
    return payoutHistory.filter(item => {
      const nameMatch = item.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = item.email.toLowerCase().includes(searchQuery.toLowerCase());
      const textMatch = nameMatch || emailMatch;

      const statusMatch = statusFilter === 'all' || item.paymentStatus === statusFilter;
      const tierMatch = tierFilter === 'all' || item.tierId === tierFilter;

      return textMatch && statusMatch && tierMatch;
    });
  }, [payoutHistory, searchQuery, statusFilter, tierFilter]);

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
    <div className="space-y-4 sm:space-y-5 pb-6 md:pb-0">
      <EventWorkspaceHeader
        eyebrow="Sales and settlement"
        title="Ticketing"
        description="Track ticket demand, payment status, payout readiness, and recent buyer activity from one event view."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Tickets sold', value: `${soldCount} / ${capacity || '∞'}`, hint: `${remainingSeats} seats remaining` },
          { label: 'Gross revenue', value: formatCurrency(selectedEvent?.currency, revenue), hint: `${paidCount} paid and ${pendingCount} pending` },
        ]}
        aside={
          selectedEvent ? (
            <a
              href={`/event-platform/e/${selectedEvent.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 px-3.5 py-2 text-xs font-bold text-[var(--text)] hover:bg-[var(--card-subtle)]/75 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span>Open page</span>
            </a>
          ) : null
        }
      />

      {/* Colorful Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          { label: 'Total Capacity', value: capacity || 'Unlimited', icon: <Ticket className="h-4 w-4 text-blue-400" />, color: 'blue' },
          { label: 'Net Payout (Est)', value: formatCurrency(selectedEvent?.currency, commission.organizationPayout), icon: <DollarSign className="h-4 w-4 text-emerald-400" />, color: 'emerald' },
          { label: 'Guild Service Fee', value: formatCurrency(selectedEvent?.currency, commission.guildFee), icon: <Percent className="h-4 w-4 text-amber-400" />, color: 'amber' },
          { label: 'Settlement Ready', value: formatCurrency(selectedEvent?.currency, payoutReady), icon: <TrendingUp className="h-4 w-4 text-[var(--primary)]" />, color: 'primary' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-${stat.color === 'primary' ? '[var(--primary)]' : stat.color + '-500'}/15`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-extrabold text-white truncate">{stat.value}</div>
              <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider truncate">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] items-start">
        
        {/* Live payout dashboard */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Live Payout Dashboard</div>
              <div className="mt-1 text-sm font-extrabold text-white">Real-time booking reconciliation</div>
            </div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500 animate-pulse">
              Live
            </span>
          </div>

          <div className="grid gap-3 grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Paid Bookings</div>
              <div className="mt-1 text-lg font-extrabold text-white">{paidCount}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Pending</div>
              <div className="mt-1 text-lg font-extrabold text-white">{pendingCount}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Seats Remaining</div>
              <div className="mt-1 text-lg font-extrabold text-white">{remainingSeats}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusTone('paid')}`}>{paidCount} Paid</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusTone('pending')}`}>{pendingCount} Pending</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusTone('failed')}`}>{failedCount} Failed</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusTone('refunded')}`}>{refundedCount} Refunded</span>
          </div>
        </div>

        {/* Balance view */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-white/5 pb-2">Reconciliation Statement</div>
          
          <div className="space-y-2 text-xs font-semibold">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-2 text-white">
              <span>Paid Gross Revenue</span>
              <span>{formatCurrency(selectedEvent?.currency, paidRevenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-2 text-[var(--primary)]">
              <span>Pending Revenue Gate</span>
              <span>{formatCurrency(selectedEvent?.currency, pendingRevenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 py-2 text-emerald-400">
              <span>Platform Service Commission ({selectedEvent ? getEventCommissionPercent(selectedEvent) : 0}%)</span>
              <span>{formatCurrency(selectedEvent?.currency, revenue - payoutReady)}</span>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-1">
            Settlement payouts are calculated solely on confirmed (Paid) bookings. Pending invoices will automatically sync upon gateway confirmation.
          </p>
        </div>
      </div>

      {selectedEvent && (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Payout Settlement Status</div>
              <div className="mt-1 text-sm font-extrabold text-white">Funds dispatch requests trigger review notifications.</div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {selectedEvent.payoutStatus === 'requested'
                  ? 'A settlement payout is currently under review by receptionists.'
                  : selectedEvent.payoutStatus === 'ready'
                    ? 'Funds are settled and ready for extraction.'
                    : 'Submit a dispatch request to start review verification.'}
              </p>
            </div>
            <span className="rounded-full border border-[var(--primary)]/20 bg-black/35 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)] self-start">
              {selectedEvent.payoutStatus || 'pending'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleDemandPayout}
              disabled={payoutUpdating || payoutGuard.isCoolingDown || isClosed || selectedEvent.payoutStatus === 'requested'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-extrabold text-black transition hover:opacity-90 disabled:opacity-50 active:scale-95 shadow-md shadow-[var(--primary)]/15"
            >
              <Wallet className="h-4 w-4" />
              <span>{payoutUpdating ? 'Submitting Request...' : selectedEvent.payoutStatus === 'requested' ? 'Payout Pending Review' : 'Request Payout Settlement'}</span>
            </button>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <BellRing className="h-3.5 w-3.5" />
              <span>Reconciled on dispatch request</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--text-muted)] pt-1 border-t border-white/5">
            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{selectedEvent.payoutRequestedAt ? `Requested ${new Date(selectedEvent.payoutRequestedAt).toLocaleString()}` : 'No dispatch requests yet'}</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{selectedEvent.status === 'completed' ? 'Event completed settlement path unlocked' : 'End event to fully clear payouts'}</span>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl border p-3.5 text-xs font-semibold animate-fade-in ${
            feedbackTone === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
              : 'border-red-500/20 bg-red-500/10 text-red-500'
          }`}
          role="alert"
        >
          {feedback}
        </div>
      )}

      {/* Registrations List Section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 space-y-4">
        
        {/* Table Toolbar: Search and Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Registrations Table</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">Filter, find, and manage checkout details.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendee..."
                className="pl-8.5 pr-8 py-2 rounded-xl border border-white/10 bg-black/40 text-xs w-48 focus:w-56 transition-all focus:border-[var(--primary)] outline-none text-white font-semibold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-white/30 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/10 bg-black text-xs text-white/80 font-bold"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Tier Filter Dropdown */}
            {tiers.length > 0 && (
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-white/10 bg-black text-xs text-white/80 font-bold"
              >
                <option value="all">All Tiers</option>
                {tiers.map(tier => (
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Dynamic List Rendering */}
        {loading || fetchingRegistrations ? (
          <div className="text-xs text-[var(--text-secondary)] py-6 text-center animate-pulse flex items-center justify-center gap-2">
            <Clock3 className="h-4 w-4 animate-spin text-[var(--primary)]" />
            <span>Fetching buyer index...</span>
          </div>
        ) : filteredPayoutHistory.length ? (
          <>
            {/* Desktop Table (Visible on MD screens and above) */}
            <div className="hidden md:block overflow-x-auto -mx-1 px-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-[var(--text-muted)] border-b border-[var(--border)] tracking-wider">
                    <th className="pb-3">Buyer / Account</th>
                    <th className="pb-3">Ticket Tier</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Gross Sale</th>
                    <th className="pb-3">Guild Fee</th>
                    <th className="pb-3">Net Revenue</th>
                    <th className="pb-3">Receipt status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-white/90">
                  {filteredPayoutHistory.map((registration) => (
                    <tr key={registration.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3">
                        <div className="font-extrabold text-white">{registration.fullName}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{registration.email}</div>
                      </td>
                      <td className="py-3 text-white/70">{registration.tier?.name || registration.tierId}</td>
                      <td className="py-3 text-white/80">{registration.qty}</td>
                      <td className="py-3">{formatCurrency(selectedEvent?.currency, registration.grossAmount)}</td>
                      <td className="py-3 text-[var(--primary)]">{formatCurrency(selectedEvent?.currency, registration.breakdown.guildFee)}</td>
                      <td className="py-3 text-emerald-400">{formatCurrency(selectedEvent?.currency, registration.breakdown.organizationPayout)}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPaymentStatusTone(registration.paymentStatus)}`}>
                          {formatPaymentStatus(registration.paymentStatus)}
                        </span>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono mt-1 font-normal">
                          {registration.createdAt ? new Date(registration.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Recorded'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Layout (Visible on screens below md) */}
            <div className="grid gap-3 md:hidden">
              {filteredPayoutHistory.map((registration) => (
                <div key={registration.id} className="rounded-xl border border-white/5 bg-black/25 p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                    <div>
                      <div className="text-xs font-extrabold text-white">{registration.fullName}</div>
                      <div className="text-[10px] text-white/40">{registration.email}</div>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${getPaymentStatusTone(registration.paymentStatus)}`}>
                      {formatPaymentStatus(registration.paymentStatus)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-white/40 block">Ticket Tier:</span>
                      <span className="font-bold text-white/80">{registration.tier?.name || registration.tierId} &bull; Qty {registration.qty}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block">Created At:</span>
                      <span className="text-white/80">{registration.createdAt ? new Date(registration.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5 text-[9px] text-center font-bold">
                    <div>
                      <span className="text-white/40 block mb-0.5">Gross</span>
                      <span className="text-white">{formatCurrency(selectedEvent?.currency, registration.grossAmount)}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">Guild Fee</span>
                      <span className="text-[var(--primary)]">{formatCurrency(selectedEvent?.currency, registration.breakdown.guildFee)}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block mb-0.5">Net Payout</span>
                      <span className="text-emerald-400">{formatCurrency(selectedEvent?.currency, registration.breakdown.organizationPayout)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-secondary)]">
            {searchQuery || statusFilter !== 'all' || tierFilter !== 'all' ? (
              <div className="space-y-2">
                <AlertCircle className="h-6 w-6 text-white/30 mx-auto" />
                <div>No registrations match your search criteria.</div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setTierFilter('all');
                  }}
                  className="text-[var(--primary)] font-bold hover:underline"
                >
                  Clear filters & search
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Ticket className="h-6 w-6 text-white/20 mx-auto" />
                <div>No registrations found for this event yet.</div>
                <p className="text-[10px] text-white/40">Share the public registration page link to start gathering ticket orders.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
