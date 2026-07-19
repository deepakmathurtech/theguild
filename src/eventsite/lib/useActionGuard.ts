import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ActionGuardOptions = {
  cooldownMs: number;
  maxAttempts?: number;
  windowMs?: number;
};

type AttemptState = {
  timestamps: number[];
  blockedUntil: number;
};

function pruneAttempts(timestamps: number[], now: number, windowMs: number) {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

export function useActionGuard({ cooldownMs, maxAttempts = 1, windowMs = cooldownMs }: ActionGuardOptions) {
  const attemptRef = useRef<AttemptState>({ timestamps: [], blockedUntil: 0 });
  const [blockedUntil, setBlockedUntil] = useState(0);

  useEffect(() => {
    if (!blockedUntil) return undefined;
    const delay = Math.max(0, blockedUntil - Date.now());
    const timer = window.setTimeout(() => setBlockedUntil(0), delay);
    return () => window.clearTimeout(timer);
  }, [blockedUntil]);

  const remainingSeconds = useMemo(() => Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)), [blockedUntil]);

  const guardAction = useCallback((message = 'Please wait a moment before trying again.') => {
    const now = Date.now();
    const current = attemptRef.current;

    if (current.blockedUntil > now) {
      setBlockedUntil(current.blockedUntil);
      return message;
    }

    const timestamps = pruneAttempts(current.timestamps, now, windowMs);
    if (timestamps.length >= maxAttempts) {
      const nextBlockedUntil = now + cooldownMs;
      attemptRef.current = { timestamps, blockedUntil: nextBlockedUntil };
      setBlockedUntil(nextBlockedUntil);
      return message;
    }

    attemptRef.current = { timestamps: [...timestamps, now], blockedUntil: now + cooldownMs };
    setBlockedUntil(now + cooldownMs);
    return null;
  }, [cooldownMs, maxAttempts, windowMs]);

  const release = useCallback(() => {
    attemptRef.current.blockedUntil = 0;
    setBlockedUntil(0);
  }, []);

  return {
    guardAction,
    release,
    isCoolingDown: blockedUntil > Date.now(),
    remainingSeconds,
  };
}
