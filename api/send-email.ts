import { loadRuntimeEnv } from './lib/runtime-env.js';
import {
  applyRateLimitOrRespond,
  getClientIp,
  isTrustedOrigin,
  isValidEmail,
  sanitizePlainText,
  setSecurityHeaders,
} from './lib/request-security.js';

function sendJson(res: any, status: number, payload: any) {
  res.status(status).json(payload);
}

export default async function handler(req: any, res: any) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed.' });
  }

  const env = loadRuntimeEnv();

  if (!isTrustedOrigin(req, env)) {
    return sendJson(res, 403, { success: false, message: 'Forbidden: untrusted origin.' });
  }

  const ip = getClientIp(req);
  const allowed = applyRateLimitOrRespond(res, {
    key: `send-email:${ip}`,
    max: 20,
    windowMs: 60_000,
    message: 'Too many email requests. Please wait a minute.',
  });
  if (!allowed) return;

  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('[send-email] RESEND_API_KEY is not configured.');
    return sendJson(res, 500, { success: false, message: 'Email service is not configured on this server.' });
  }

  const body = req.body || {};
  const to = sanitizePlainText(body.to, 254);
  const fullName = sanitizePlainText(body.fullName, 120);
  const eventName = sanitizePlainText(body.eventName, 200);
  const registrationId = sanitizePlainText(body.registrationId, 64);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  if (!to || !isValidEmail(to)) {
    return sendJson(res, 400, { success: false, message: 'Invalid or missing recipient email address.' });
  }
  if (!fullName || !eventName || !registrationId) {
    return sendJson(res, 400, { success: false, message: 'Missing required fields: fullName, eventName, registrationId.' });
  }

  const certId = `CERT-2026-${registrationId.substring(0, 6).toUpperCase()}`;
  const verifyLink = `${env.APP_ORIGIN || env.VITE_APP_ORIGIN || 'https://theguild.in'}/impact`;
  const fromName = env.EMAIL_FROM_NAME || 'The Guild';
  const fromAddress = env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px 24px; max-width: 600px; margin: auto; background-color: #07070a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; color: #f7f5f0;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #dcb36c; opacity: 0.8;">THE GUILD TRUST ENGINE</span>
      </div>
      <h1 style="color: #f7f5f0; margin: 0 0 8px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.2;">Your Verified Certificate<br/>is Ready! 🎉</h1>
      <p style="font-size: 14px; color: rgba(247,245,240,0.65); margin: 0 0 28px; line-height: 1.6;">Hi <strong style="color: #f7f5f0;">${fullName}</strong>, congratulations on completing your event. Your official certificate is registered and verified on the Guild Trust Ledger.</p>

      <div style="background-color: rgba(220,179,108,0.06); border: 1px solid rgba(220,179,108,0.2); padding: 20px 22px; border-radius: 12px; margin-bottom: 28px;">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(247,245,240,0.45);">Event</p>
        <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #f7f5f0;">${eventName}</p>
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(247,245,240,0.45);">Certificate ID</p>
        <p style="margin: 0; font-size: 13px; font-family: 'Courier New', monospace; color: #dcb36c; font-weight: 700;">${certId}</p>
      </div>

      <p style="text-align: center; margin: 0 0 32px;">
        <a href="${verifyLink}" style="display: inline-block; background-color: #dcb36c; color: #07070a; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: -0.01em;">Verify in Guild Passport →</a>
      </p>

      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.07); margin: 0 0 20px;" />
      <p style="font-size: 11px; color: rgba(247,245,240,0.3); text-align: center; margin: 0; line-height: 1.6;">This certificate was issued by The Guild Trust Engine.<br/>If you did not attend this event, you can safely ignore this email.</p>
    </div>
  `;

  const textBody = `Hi ${fullName},\n\nCongratulations! Your completion certificate for "${eventName}" is registered on the Guild Trust Ledger.\n\nCertificate ID: ${certId}\nVerify your record here: ${verifyLink}\n\nBest regards,\nThe Guild Team`;

  try {
    const emailPayload: any = {
      from: `${fromName} <${fromAddress}>`,
      to: [to],
      subject: `Your verified certificate for ${eventName} is ready! 🎉`,
      html: htmlBody,
      text: textBody,
    };

    // Attach certificate PDF if provided
    if (attachments.length > 0) {
      emailPayload.attachments = attachments.map((att: any) => ({
        filename: att.filename || 'certificate.pdf',
        content: att.content, // base64 string
      }));
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json() as { id?: string; name?: string; message?: string; statusCode?: number };

    if (!response.ok) {
      console.error('[send-email] Resend API error:', result);
      return sendJson(res, 502, {
        success: false,
        message: `Resend API error: ${result.message || result.name || 'Unknown error'}`,
        detail: result,
      });
    }

    console.log(`[send-email] ✅ Sent to ${to} via Resend. Message ID: ${result.id}`);
    return sendJson(res, 200, { success: true, messageId: result.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email] Fetch error:', msg);
    return sendJson(res, 500, { success: false, message: `Failed to reach Resend API: ${msg}` });
  }
}
