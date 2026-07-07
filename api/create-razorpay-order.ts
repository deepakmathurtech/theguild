import Razorpay from 'razorpay';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { loadRuntimeEnv } from './lib/runtime-env';

function sendJson(res: any, status: number, payload: any) {
  res.status(status).json(payload);
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function ensureAdmin() {
  if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_ADMIN_SA_JSON;
    if (!serviceAccount) {
      throw new Error('FIREBASE_ADMIN_SA_JSON not set');
    }
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }
  return getFirestore();
}

export function createRazorpayOrderHandler(deps: {
  createRazorpayClient?: (config: { key_id: string; key_secret: string }) => any;
  getDb?: () => any;
  getEnv?: () => NodeJS.ProcessEnv;
  loadEventForValidation?: (eventId: string) => Promise<any>;
} = {}) {
  return async function handler(req: any, res: any) {
    try {
      if (req.method !== 'POST') {
        return sendJson(res, 405, { success: false, message: 'Method not allowed', error: 'METHOD_NOT_ALLOWED' });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const {
        eventId,
        tierId,
        fullName,
        email,
        qty,
        amount,
        currency,
        metadata,
      } = body;

      const env = deps.getEnv?.() ?? loadRuntimeEnv(process.env);
      const razorpayKeyId = env.RAZORPAY_KEY_ID;
      const razorpaySecret = env.RAZORPAY_KEY_SECRET;
      const expectedCurrency = env.RAZORPAY_CURRENCY || 'INR';

      if (!razorpayKeyId || !razorpaySecret) {
        return sendJson(res, 500, { success: false, message: 'Razorpay credentials not configured', error: 'RZP_NOT_CONFIGURED' });
      }

      const parsedAmountPaise = toNumber(amount);
      if (parsedAmountPaise === null || parsedAmountPaise <= 0) {
        return sendJson(res, 400, { success: false, message: 'Invalid amount', error: 'INVALID_AMOUNT' });
      }

      const parsedCurrency = typeof currency === 'string' ? currency.toUpperCase() : '';
      if (!parsedCurrency) {
        return sendJson(res, 400, { success: false, message: 'Currency is required', error: 'CURRENCY_REQUIRED' });
      }
      if (expectedCurrency && parsedCurrency !== expectedCurrency) {
        return sendJson(res, 400, { success: false, message: 'Unsupported currency', error: 'INVALID_CURRENCY' });
      }

      if (typeof eventId !== 'string' || !eventId.trim()) {
        return sendJson(res, 400, { success: false, message: 'Event id is required', error: 'EVENT_ID_REQUIRED' });
      }
      if (typeof tierId !== 'string' || !tierId.trim()) {
        return sendJson(res, 400, { success: false, message: 'Ticket tier is required', error: 'TIER_ID_REQUIRED' });
      }
      if (typeof fullName !== 'string' || !fullName.trim()) {
        return sendJson(res, 400, { success: false, message: 'Full name is required', error: 'FULL_NAME_REQUIRED' });
      }
      if (typeof email !== 'string' || !email.trim()) {
        return sendJson(res, 400, { success: false, message: 'Email is required', error: 'EMAIL_REQUIRED' });
      }

      const parsedQty = Math.max(1, Number(qty) || 1);
      const event = deps.loadEventForValidation ? await deps.loadEventForValidation(eventId) : null;
      if (event?.ticketTiers) {
        const tier = event.ticketTiers.find((candidate: any) => candidate.id === tierId);
        if (!tier) {
          return sendJson(res, 400, { success: false, message: 'Ticket tier not found', error: 'TIER_NOT_FOUND' });
        }
        const expectedAmount = Math.round(Number(tier.price) * 100 * parsedQty);
        if (Math.round(Number(parsedAmountPaise)) !== expectedAmount) {
          return sendJson(res, 400, { success: false, message: 'Invalid amount', error: 'INVALID_AMOUNT' });
        }
      }

      const razorpay = deps.createRazorpayClient?.({ key_id: razorpayKeyId, key_secret: razorpaySecret }) ?? new Razorpay({ key_id: razorpayKeyId, key_secret: razorpaySecret });
      const order = await (razorpay.orders.create as any)({
        amount: Math.round(parsedAmountPaise),
        currency: parsedCurrency,
        payment_capture: true,
        notes: {
          eventId,
          tierId,
          fullName: String(fullName).trim(),
          email: String(email).trim(),
          qty: String(parsedQty),
          metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata ?? {}),
        },
      });

      const orderId = (order as any)?.id;
      const orderAmount = (order as any)?.amount;
      const orderCurrency = (order as any)?.currency;

      if (!orderId) {
        return sendJson(res, 500, { success: false, message: 'Razorpay order response missing id', error: 'RAZORPAY_ORDER_MISSING_ID' });
      }

      const db = deps.getDb?.() ?? ensureAdmin();
      const pendingOrderRef = db.collection('razorpay_pending_orders').doc(orderId);
      await pendingOrderRef.set({
        eventId,
        tierId,
        fullName: String(fullName).trim(),
        email: String(email).trim(),
        qty: parsedQty,
        amount: Number(parsedAmountPaise),
        currency: parsedCurrency,
        status: 'created',
        createdAt: new Date().toISOString(),
      }, { merge: true });

      return sendJson(res, 200, {
        success: true,
        data: { order_id: orderId, amount: orderAmount, currency: orderCurrency },
      });
    } catch (err: any) {
      console.error('create-razorpay-order failed', err);
      const message = err?.message || 'Failed to create Razorpay order';
      return sendJson(res, 500, { success: false, message, error: String(message) });
    }
  };
}

export default createRazorpayOrderHandler();


