import { describe, expect, it, vi } from 'vitest';

import { createRazorpayOrderHandler } from '../create-razorpay-order';
import { createVerifyRazorpayPaymentHandler } from '../verify-razorpay-payment';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
}

function createMemoryDb(seed: Record<string, Record<string, unknown>> = {}) {
  const store = new Map<string, Record<string, unknown>>(Object.entries(seed));

  const makeDoc = (path: string) => ({
    async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
      const previous = store.get(path) || {};
      store.set(path, options?.merge ? { ...previous, ...data } : data);
    },
    async get() {
      const data = store.get(path);
      return {
        exists: data !== undefined,
        data: () => data,
      };
    },
    collection(name: string) {
      return makeCollection(`${path}/${name}`);
    },
  });

  const makeCollection = (path: string) => ({
    doc(id: string) {
      return makeDoc(`${path}/${id}`);
    },
  });

  return {
    collection(name: string) {
      return makeCollection(name);
    },
    read(path: string) {
      return store.get(path);
    },
  };
}

const baseEnv = {
  RAZORPAY_KEY_ID: 'key',
  RAZORPAY_KEY_SECRET: 'secret',
  RAZORPAY_CURRENCY: 'INR',
  APP_ORIGIN: 'https://guild.test',
};

describe('Razorpay payment handlers', () => {
  it('rejects tampered amounts before creating an order', async () => {
    const handler = createRazorpayOrderHandler({
      createRazorpayClient: vi.fn(),
      getDb: vi.fn(),
      getEnv: () => baseEnv,
      loadEventForValidation: async () => ({
        id: 'event-1',
        ticketTiers: [{ id: 'tier-1', price: 100, capacity: 20 }],
      }),
    });

    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { origin: 'https://guild.test' },
      body: { eventId: 'event-1', tierId: 'tier-1', fullName: 'A User', email: 'a@example.com', qty: 1, amount: 999, currency: 'INR' },
    }, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_AMOUNT' }));
  });

  it('creates an order and stores a pending payment record', async () => {
    const db = createMemoryDb();
    const createRazorpayClient = vi.fn().mockReturnValue({
      orders: {
        create: vi.fn().mockResolvedValue({ id: 'order_123', amount: 10000, currency: 'INR' }),
      },
    });

    const handler = createRazorpayOrderHandler({
      createRazorpayClient,
      getDb: () => db,
      getEnv: () => baseEnv,
      loadEventForValidation: async () => ({
        id: 'event-1',
        ticketTiers: [{ id: 'tier-1', price: 100, capacity: 20 }],
      }),
    });

    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { origin: 'https://guild.test' },
      body: { eventId: 'event-1', tierId: 'tier-1', fullName: 'A User', email: 'a@example.com', qty: 1, amount: 10000, currency: 'INR' },
    }, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(db.read('razorpay_pending_orders/order_123')).toEqual(expect.objectContaining({
      eventId: 'event-1',
      tierId: 'tier-1',
      email: 'a@example.com',
      status: 'created',
    }));
  });

  it('rejects invalid Razorpay signatures during verification', async () => {
    const handler = createVerifyRazorpayPaymentHandler({
      getDb: () => createMemoryDb(),
      getEnv: () => baseEnv,
      verifySignature: vi.fn(() => false),
    });

    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { origin: 'https://guild.test' },
      body: { eventId: 'event-1', orderId: 'order-1', paymentId: 'pay-1', razorpaySignature: 'bad', amount: 100, currency: 'INR' },
    }, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_SIGNATURE' }));
  });

  it('verifies payment signatures with the Razorpay shared secret', async () => {
    const db = createMemoryDb({
      'razorpay_pending_orders/order-1': {
        eventId: 'event-1',
        tierId: 'tier-1',
        fullName: 'A User',
        email: 'a@example.com',
        qty: 1,
        amount: 100,
        currency: 'INR',
        status: 'created',
      },
    });

    const verifySignature = vi.fn(() => true);
    const handler = createVerifyRazorpayPaymentHandler({
      getDb: () => db,
      getEnv: () => baseEnv,
      verifySignature,
      createRazorpayClient: () => ({
        payments: {
          fetch: vi.fn().mockResolvedValue({ amount: 100, status: 'captured' }),
        },
      }),
    });

    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { origin: 'https://guild.test' },
      body: { eventId: 'event-1', tierId: 'tier-1', orderId: 'order-1', paymentId: 'pay-1', razorpaySignature: 'sig', amount: 100, currency: 'INR' },
    }, res as any);

    expect(verifySignature).toHaveBeenCalledWith('order-1|pay-1', 'sig', 'secret');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.read('events/event-1/registrations/order-1_pay-1')).toEqual(expect.objectContaining({
      eventId: 'event-1',
      tierId: 'tier-1',
      paymentStatus: 'paid',
      paymentId: 'pay-1',
    }));
  });
});
