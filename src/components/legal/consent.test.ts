import { describe, expect, it, beforeEach } from 'vitest';
import { getCookieConsentPreference, saveCookieConsentPreference } from './consent';

describe('cookie consent helpers', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const storage: Storage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
      removeItem: (key) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index) => Array.from(store.keys())[index] ?? null,
      get length() { return store.size; },
    } as Storage;

    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    });
  });

  it('returns essential-only defaults when no preference is stored', () => {
    localStorage.clear();
    expect(getCookieConsentPreference()).toEqual({
      essential: true,
      analytics: false,
      marketing: false,
    });
  });

  it('persists and reads a saved consent preference', () => {
    saveCookieConsentPreference({ essential: true, analytics: true, marketing: false });
    expect(getCookieConsentPreference()).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
    });
  });
});
