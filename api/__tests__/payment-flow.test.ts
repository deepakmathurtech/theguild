import { describe, expect, it, vi } from 'vitest';
import { createRazorpayOrderHandler } from '../create-razorpay-order';
import { createVerifyRazorpayPaymentHandler } from '../verify-razorpay-payment';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

describe('Razorpay payment handlers', () => {
  it('rejects tampered amounts before creating an order', async () => {
    const handler = createRazorpayOrderHandler({
      createRazorpayClient: vi.fn(),
      getDb: vi.fn(),
      getEnv: () => ({ RAZORPAY_KEY_ID: 'key', RAZORPAY_KEY_SECRET: 'secret', RAZORPAY_CURRENCY: 'INR' }),
      loadEventForValidation: async () => ({
        id: 'event-1',
        ticketTiers: [{ id: 'tier-1', price: 100, capacity: 20 }],
      }),
    });

    const res = mockRes();
    await handler({ method: 'POST', body: { eventId: 'event-1', tierId: 'tier-1', fullName: 'A', email: 'a@example.com', qty: 1, amount: 999, currency: 'INR' } }, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_AMOUNT' }));
  });

  it('rejects invalid Razorpay signatures during verification', async () => {
    const handler = createVerifyRazorpayPaymentHandler({
      getDb: vi.fn(),
      getEnv: () => ({ RAZORPAY_KEY_ID: 'key', RAZORPAY_KEY_SECRET: 'secret', RAZORPAY_WEBHOOK_SECRET: 'webhook-secret' }),
      verifySignature: vi.fn(() => false),
    });

    const res = mockRes();
    await handler({ method: 'POST', body: { registrationId: 'reg-1', eventId: 'event-1', orderId: 'order-1', paymentId: 'pay-1', razorpaySignature: 'bad', amount: 100, currency: 'INR' } }, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INVALID_SIGNATURE' }));
  });

  it('verifies payment signatures with the Razorpay shared secret', async () => {
    const verifySignature = vi.fn(() => true);
    const handler = createVerifyRazorpayPaymentHandler({
      getDb: vi.fn(),
      getEnv: () => ({ RAZORPAY_KEY_ID: 'key', RAZORPAY_KEY_SECRET: 'secret', RAZORPAY_WEBHOOK_SECRET: 'webhook-secret' }),
      verifySignature,
    });

    const res = mockRes();
    await handler({ method: 'POST', body: { eventId: 'event-1', orderId: 'order-1', paymentId: 'pay-1', razorpaySignature: 'sig', amount: 100, currency: 'INR' } }, res as any);

    expect(verifySignature).toHaveBeenCalledWith('order-1|pay-1', 'sig', 'secret');
  });

  it('creates an order locally when Firebase admin credentials are unavailable', async () => {
    const createRazorpayClient = vi.fn().mockReturnValue({
      orders: {
        create: vi.fn().mockResolvedValue({ id: 'order_123', amount: 10000, currency: 'INR' }),
      },
    });

    const handler = createRazorpayOrderHandler({
      createRazorpayClient,
      getDb: vi.fn(),
      getEnv: () => ({ RAZORPAY_KEY_ID: 'key', RAZORPAY_KEY_SECRET: 'secret', RAZORPAY_CURRENCY: 'INR' }),
      loadEventForValidation: async () => ({
        id: 'event-1',
        ticketTiers: [{ id: 'tier-1', price: 100, capacity: 20 }],
      }),
    });

    const res = mockRes();
    await handler({ method: 'POST', body: { eventId: 'event-1', tierId: 'tier-1', fullName: 'A', email: 'a@example.com', qty: 1, amount: 10000, currency: 'INR' } }, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
