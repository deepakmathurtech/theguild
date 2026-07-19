import { useEffect, useState } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { defaultConsent, getCookieConsentPreference, saveCookieConsentPreference, type CookieConsentPreference } from './consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [preference, setPreference] = useState<CookieConsentPreference>(defaultConsent);

  useEffect(() => {
    const stored = getCookieConsentPreference();
    setPreference(stored);
    setVisible(!window.localStorage.getItem('guild-cookie-consent'));
  }, []);

  const handleSave = (next: CookieConsentPreference) => {
    saveCookieConsentPreference(next);
    setPreference(next);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[var(--primary)]/10 p-2">
          <Cookie className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">Cookie preferences</h3>
            <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            We use essential cookies for sign-in and stability, and we can optionally use analytics cookies to improve the experience. You can change this choice anytime in our legal center.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => handleSave({ ...preference, analytics: false, marketing: false })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold">Essential only</button>
            <button onClick={() => handleSave({ ...preference, analytics: true, marketing: false })} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-black">Allow analytics</button>
            <button onClick={() => handleSave({ ...preference, analytics: true, marketing: true })} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-black">Allow all</button>
          </div>
        </div>
      </div>
    </div>
  );
}
