import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function sendJson(res: any, status: number, payload: any) {
  res.status(status).json(payload);
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

export function createVerifyRazorpayPaymentHandler(deps: {
  getDb?: () => any;
  getEnv?: () => NodeJS.ProcessEnv;
  verifySignature?: (params: string, signature: string, secret: string) => boolean;
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
        orderId,
        paymentId,
        razorpaySignature,
        metadata,
      } = body;

      const env = deps.getEnv?.() ?? process.env;
      const razorpayKeyId = env.RAZORPAY_KEY_ID;
      const razorpaySecret = env.RAZORPAY_KEY_SECRET;
      const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

      if (!razorpayKeyId || !razorpaySecret) {
        return sendJson(res, 500, { success: false, message: 'Razorpay credentials not configured', error: 'RZP_NOT_CONFIGURED' });
      }
      if (!webhookSecret) {
        return sendJson(res, 500, { success: false, message: 'Razorpay webhook secret not configured', error: 'WEBHOOK_NOT_CONFIGURED' });
      }

      if (typeof orderId !== 'string' || !orderId.trim()) {
        return sendJson(res, 400, { success: false, message: 'Order id is required', error: 'ORDER_ID_REQUIRED' });
      }
      if (typeof paymentId !== 'string' || !paymentId.trim()) {
        return sendJson(res, 400, { success: false, message: 'Payment id is required', error: 'PAYMENT_ID_REQUIRED' });
      }
      if (typeof razorpaySignature !== 'string' || !razorpaySignature.trim()) {
        return sendJson(res, 400, { success: false, message: 'Razorpay signature is required', error: 'SIGNATURE_REQUIRED' });
      }

      const expectedAmount = toNumber(amount);
      if (expectedAmount === null || expectedAmount <= 0) {
        return sendJson(res, 400, { success: false, message: 'Invalid amount', error: 'INVALID_AMOUNT' });
      }

      const payload = `${orderId}|${paymentId}`;
      const verifySignature = deps.verifySignature ?? ((params: string, signature: string, secret: string) => {
        const expected = crypto.createHmac('sha256', secret).update(params).digest('hex');
        const expectedBuffer = Buffer.from(expected, 'utf8');
        const signatureBuffer = Buffer.from(signature, 'utf8');
        if (expectedBuffer.length !== signatureBuffer.length) {
          return false;
        }
        return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
      });

      const isValid = verifySignature(payload, razorpaySignature, webhookSecret);
      if (!isValid) {
        return sendJson(res, 400, { success: false, message: 'Invalid Razorpay signature', error: 'INVALID_SIGNATURE' });
      }

      const db = deps.getDb?.() ?? ensureAdmin();
      const pendingOrderRef = db.collection('razorpay_pending_orders').doc(orderId);
      const pendingOrder = await pendingOrderRef.get();
      if (!pendingOrder.exists) {
        return sendJson(res, 404, { success: false, message: 'Pending order not found', error: 'PENDING_ORDER_NOT_FOUND' });
      }

      const pendingData = pendingOrder.data() || {};
      if (pendingData.status === 'verified') {
        return sendJson(res, 200, { success: true, data: { duplicate: true } });
      }

      const client = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpaySecret });
      const payment = await (client.payments.fetch as any)(paymentId);
      const paymentAmount = Number(payment?.amount || 0);
      const paymentStatus = String(payment?.status || '').toLowerCase();
      if (paymentStatus !== 'captured') {
        return sendJson(res, 400, { success: false, message: 'Payment not captured', error: 'PAYMENT_NOT_CAPTURED' });
      }
      if (paymentAmount !== Number(expectedAmount)) {
        return sendJson(res, 400, { success: false, message: 'Payment amount mismatch', error: 'AMOUNT_MISMATCH' });
      }

      const registrationRef = db.collection('events').doc(String(eventId)).collection('registrations').doc(`${orderId}_${paymentId}`);
      await registrationRef.set({
        eventId,
        tierId,
        fullName: String(fullName || pendingData.fullName || '').trim(),
        email: String(email || pendingData.email || '').trim(),
        qty: Number(qty || pendingData.qty || 1),
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentProvider: 'razorpay',
        paymentAmount: Number(expectedAmount),
        paymentCurrency: currency || pendingData.currency || 'INR',
        orderId,
        paymentId,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      }, { merge: true });

      await pendingOrderRef.set({
        ...pendingData,
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        paymentId,
      }, { merge: true });

      return sendJson(res, 200, { success: true, data: { verified: true, orderId, paymentId } });
    } catch (err: any) {
      console.error('verify-razorpay-payment failed', err);
      return sendJson(res, 500, { success: false, message: 'Payment verification failed', error: String(err?.message || err) });
    }
  };
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default createVerifyRazorpayPaymentHandler();
