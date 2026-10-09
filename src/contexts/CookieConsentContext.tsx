import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CONSENT_STORAGE_KEY, readConsent, storeConsent, type CookieConsent, type OptionalCookieCategory } from '@/lib/cookieConsent';

interface ConsentContextValue {
  consent: CookieConsent | null;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  saveConsent: (choices: Pick<CookieConsent, OptionalCookieCategory>) => boolean;
  error: string | null;
}
const ConsentContext = createContext<ConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  // Read synchronously: a remembered choice never flashes the banner.
  const [consent, setConsent] = useState<CookieConsent | null>(readConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) setConsent(readConsent());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const saveConsent = useCallback((choices: Pick<CookieConsent, OptionalCookieCategory>) => {
    const saved = storeConsent(choices);
    if (!saved) {
      setError('Your browser could not save this choice. Enable local storage and try again. Optional cookies remain off.');
      return false;
    }
    setConsent(saved);
    setError(null);
    setSettingsOpen(false);
    return true;
  }, []);
  return <ConsentContext.Provider value={{ consent, settingsOpen, error, saveConsent,
    openSettings: () => { setError(null); setSettingsOpen(true); }, closeSettings: () => setSettingsOpen(false) }}>
    {children}
  </ConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('Cookie consent must be used within CookieConsentProvider');
  return context;
}

/** Future optional integrations must initialize here and return teardown on revocation. */
export function useOptionalConsentEffect(category: OptionalCookieCategory, initialize: () => void | (() => void)) {
  const { consent } = useCookieConsent();
  const allowed = consent?.[category] === true;
  useEffect(() => {
    if (!allowed) return;
    return initialize();
  }, [allowed, initialize]);
}