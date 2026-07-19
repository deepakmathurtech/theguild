import type { EventDocument, TicketRegistration, TicketTier } from './eventModels';
import { calculateCommissionBreakdown, getEventCommissionPercent } from './pricing';

export type EventHistorySummary = {
  sold: number;
  capacity: number;
  remaining: number;
  grossRevenue: number;
  paidCount: number;
  pendingCount: number;
  payoutReady: number;
  tierBreakdown: Array<{
    tierId: string;
    name: string;
    sold: number;
    capacity: number;
    revenue: number;
    rate: number;
  }>;
};

export function isHistoricalEvent(event: Partial<EventDocument> | null | undefined) {
  if (!event) return false;
  if (event.status === 'completed' || event.status === 'archived' || event.status === 'cancelled') {
    return true;
  }

  if (!event.endAt) return false;
  const endAt = new Date(event.endAt);
  if (Number.isNaN(endAt.getTime())) return false;
  return endAt.getTime() < Date.now();
}

export function summarizeEventMetrics(
  event: Partial<EventDocument> | null | undefined,
  registrations: Array<TicketRegistration & { id?: string }>,
  tiers: TicketTier[]
): EventHistorySummary {
  const sold = registrations.reduce((sum, registration) => sum + Number(registration.qty || 0), 0);
  const capacity = tiers.reduce((sum, tier) => sum + Number(tier.capacity || 0), 0);

  const grossRevenue = registrations.reduce((sum, registration) => {
    const tier = tiers.find((item) => item.id === registration.tierId);
    return sum + Number(tier?.price || 0) * Number(registration.qty || 0);
  }, 0);

  const breakdown = calculateCommissionBreakdown(grossRevenue, getEventCommissionPercent(event as any));
  const paidCount = registrations.filter((registration) => registration.paymentStatus === 'paid').length;
  const pendingCount = registrations.filter((registration) => registration.paymentStatus !== 'paid').length;

  const tierBreakdown = tiers.map((tier) => {
    const soldForTier = registrations.filter((registration) => registration.tierId === tier.id).reduce((sum, registration) => sum + Number(registration.qty || 0), 0);
    const revenueForTier = soldForTier * Number(tier.price || 0);
    return {
      tierId: tier.id,
      name: tier.name,
      sold: soldForTier,
      capacity: Number(tier.capacity || 0),
      revenue: revenueForTier,
      rate: soldForTier > 0 ? soldForTier / Math.max(Number(tier.capacity || 0), 1) : 0,
    };
  });

  return {
    sold,
    capacity,
    remaining: Math.max(0, capacity - sold),
    grossRevenue,
    paidCount,
    pendingCount,
    payoutReady: breakdown.organizationPayout,
    tierBreakdown,
  };
}
