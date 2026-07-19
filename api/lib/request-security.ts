type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitState>();

function now() {
  return Date.now();
}

function cleanupExpiredEntries() {
  const current = now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= current) {
      rateLimitStore.delete(key);
    }
  }
}

export function setSecurityHeaders(res: any) {
  if (!res?.setHeader) return;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
}

export function getClientIp(req: any) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || req?.ip || 'unknown';
}

export function applyRateLimit(input: {
  key: string;
  max: number;
  windowMs: number;
}) {
  cleanupExpiredEntries();

  const current = now();
  const existing = rateLimitStore.get(input.key);
  if (!existing || existing.resetAt <= current) {
    rateLimitStore.set(input.key, { count: 1, resetAt: current + input.windowMs });
    return { allowed: true, remaining: Math.max(0, input.max - 1), resetAt: current + input.windowMs };
  }

  existing.count += 1;
  rateLimitStore.set(input.key, existing);

  return {
    allowed: existing.count <= input.max,
    remaining: Math.max(0, input.max - existing.count),
    resetAt: existing.resetAt,
  };
}

export function applyRateLimitOrRespond(res: any, input: {
  key: string;
  max: number;
  windowMs: number;
  message?: string;
}) {
  const result = applyRateLimit(input);
  if (res?.setHeader) {
    res.setHeader('X-RateLimit-Limit', String(input.max));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.resetAt));
  }

  if (!result.allowed) {
    res.status(429).json({
      success: false,
      message: input.message || 'Too many requests. Please try again shortly.',
      error: 'RATE_LIMITED',
    });
    return false;
  }

  return true;
}

export function isTrustedOrigin(req: any, env: NodeJS.ProcessEnv) {
  const originHeader = req?.headers?.origin || req?.headers?.Origin || '';
  const refererHeader = req?.headers?.referer || req?.headers?.Referer || '';
  const rawSource = typeof originHeader === 'string' && originHeader.trim() ? originHeader : typeof refererHeader === 'string' ? refererHeader : '';

  if (!rawSource) {
    return true;
  }

  const allowedOrigins = new Set<string>();
  const explicitOrigins = [env.APP_ORIGIN, env.VITE_APP_ORIGIN, env.PUBLIC_APP_ORIGIN].filter((value): value is string => Boolean(value));
  explicitOrigins.forEach((value) => allowedOrigins.add(value.replace(/\/$/, '')));

  if (env.VERCEL_URL) {
    allowedOrigins.add(`https://${env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);
  }

  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');

  try {
    const parsed = new URL(rawSource);
    return allowedOrigins.has(parsed.origin.replace(/\/$/, ''));
  } catch {
    return false;
  }
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sanitizePlainText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
