import Razorpay from 'razorpay';

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

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { success: false, message: 'Method not allowed', error: 'METHOD_NOT_ALLOWED' });
    }


    const { amount, currency } = (req.body ?? {}) as { amount?: unknown; currency?: unknown };


    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    const expectedCurrency = process.env.RAZORPAY_CURRENCY || 'INR';

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
      return sendJson(res, 400, { success: false, message: `Unsupported currency`, error: 'INVALID_CURRENCY' });
    }



    // Razorpay client
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpaySecret });

    // Create order in paise
    const order = await (razorpay.orders.create as any)({
      amount: Math.round(parsedAmountPaise),
      currency: parsedCurrency,
      payment_capture: true,
    });

    // Razorpay returns an order object.
    const orderId = (order as any)?.id;
    const orderAmount = (order as any)?.amount;
    const orderCurrency = (order as any)?.currency;


    if (!orderId) {
      return sendJson(res, 500, {
        success: false,
        message: 'Razorpay order response missing id',
        error: 'RAZORPAY_ORDER_MISSING_ID',
      });

    }

    return sendJson(res, 200, {
      success: true,
      data: {
        order_id: orderId,
        amount: orderAmount,
        currency: orderCurrency,
      },
    });

  } catch (err: any) {
    console.error('create-razorpay-order failed', err);
    return sendJson(res, 500, { success: false, message: 'Failed to create Razorpay order', error: String(err?.message || err) });
  }
}


