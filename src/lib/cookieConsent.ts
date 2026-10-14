export const CONSENT_STORAGE_KEY = 'tradenova-cookie-consent';
// Increment only when purposes/categories materially change.
export const CONSENT_VERSION = 1;
export type OptionalCookieCategory = 'analytics' | 'marketing';
export interface CookieConsent {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== CONSENT_VERSION || value.essential !== true ||
      typeof value.analytics !== 'boolean' || typeof value.marketing !== 'boolean' ||
      typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) return null;
    return {
      version: CONSENT_VERSION, essential: true, analytics: value.analytics,
      marketing: value.marketing, updatedAt: value.updatedAt,
    };
  } catch { return null; }
}

export function readConsent(): CookieConsent | null {
  try { return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY)); }
  catch { return null; }
}

export function storeConsent(choices: Pick<CookieConsent, OptionalCookieCategory>): CookieConsent | null {
  const consent: CookieConsent = {
    version: CONSENT_VERSION, essential: true, analytics: choices.analytics,
    marketing: choices.marketing, updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    return consent;
  } catch { return null; }
}