import { describe, expect, it } from 'vitest';
import { isHistoricalEvent, summarizeEventMetrics } from './eventHistory';

describe('event history helpers', () => {
  it('marks completed and past events as historical', () => {
    const completed = { status: 'completed' } as any;
    const past = { status: 'published', endAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } as any;
    const upcoming = { status: 'published', endAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } as any;

    expect(isHistoricalEvent(completed)).toBe(true);
    expect(isHistoricalEvent(past)).toBe(true);
    expect(isHistoricalEvent(upcoming)).toBe(false);
  });

  it('summarizes registration volume, revenue, and tier mix', () => {
    const event = { status: 'completed', currency: 'INR', paymentConfig: { platformCommissionPercent: 10 } } as any;
    const registrations = [
      { qty: 2, tierId: 'tier-1', paymentStatus: 'paid' },
      { qty: 1, tierId: 'tier-2', paymentStatus: 'pending' },
    ] as any[];
    const tiers = [
      { id: 'tier-1', name: 'Standard', price: 100, capacity: 20 },
      { id: 'tier-2', name: 'Student', price: 50, capacity: 10 },
    ] as any[];

    const summary = summarizeEventMetrics(event, registrations, tiers);

    expect(summary.sold).toBe(3);
    expect(summary.capacity).toBe(30);
    expect(summary.grossRevenue).toBe(250);
    expect(summary.paidCount).toBe(2);
    expect(summary.pendingCount).toBe(1);
    expect(summary.tierBreakdown[0].sold).toBe(2);
    expect(summary.tierBreakdown[0].rate).toBe(0.1);
    expect(summary.payoutReady).toBe(225);
  });
});
