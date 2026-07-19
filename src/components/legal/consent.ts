export type CookieConsentPreference = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_KEY = 'guild-cookie-consent';

export const defaultConsent: CookieConsentPreference = {
  essential: true,
  analytics: false,
  marketing: false,
};

export function getCookieConsentPreference(): CookieConsentPreference {
  if (typeof window === 'undefined') return defaultConsent;

  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (!stored) return defaultConsent;
    const parsed = JSON.parse(stored) as Partial<CookieConsentPreference>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return defaultConsent;
  }
}

export function saveCookieConsentPreference(pref: CookieConsentPreference) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(pref));
}

export function hasAnalyticsConsent() {
  return getCookieConsentPreference().analytics;
}
