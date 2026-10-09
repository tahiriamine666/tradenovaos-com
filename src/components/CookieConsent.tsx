import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

export function CookieSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useCookieConsent();
  return <Button variant="ghost" className={className} onClick={openSettings}>
    <SlidersHorizontal aria-hidden="true" />Cookie Settings
  </Button>;
}

function PolicyLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
    <Link className="underline underline-offset-4 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" to="/privacy" onClick={onNavigate}>Privacy Policy</Link>
    <Link className="underline underline-offset-4 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" to="/cookies" onClick={onNavigate}>Cookie Policy</Link>
  </div>;
}

export default function CookieConsentPanel() {
  const { consent, settingsOpen, openSettings, closeSettings, saveConsent, error } = useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    if (settingsOpen) {
      setAnalytics(consent?.analytics ?? false);
      setMarketing(consent?.marketing ?? false);
    }
  }, [settingsOpen, consent]);
  return <>
    {!consent && !settingsOpen && <section aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description"
      aria-label="Cookie consent" className="tn-cookie-banner fixed z-[60] rounded-lg border border-primary/20 bg-card p-5 text-foreground tn-edge-light">
      <div className="flex items-start gap-3">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 id="cookie-consent-title" className="text-base font-semibold">Your privacy matters</h2>
          <p id="cookie-consent-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">We use essential cookies to keep TradeNova secure and working properly. With your permission, we may also use optional cookies to understand usage and improve the experience.</p>
        </div>
      </div>
      <div className="mt-4"><PolicyLinks /></div>
      {error && <p role="alert" className="mt-3 text-sm text-foreground">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button variant="outline" className="min-h-11" onClick={() => saveConsent({ analytics: false, marketing: false })}>Essential Only</Button>
        <Button variant="outline" className="min-h-11" onClick={() => saveConsent({ analytics: true, marketing: true })}>Accept All</Button>
        <Button variant="ghost" className="col-span-2 min-h-11" onClick={openSettings}><SlidersHorizontal aria-hidden="true" />Cookie Settings</Button>
      </div>
    </section>}
    <Dialog open={settingsOpen} onOpenChange={(open) => { if (!open) closeSettings(); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle>Cookie Settings</DialogTitle>
          <DialogDescription>Choose which optional cookies you allow. Essential storage keeps sign-in and security working.</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <div className="flex items-start justify-between gap-4 py-4">
            <div><p className="text-sm font-semibold">Essential</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Authentication, security and saved app preferences. Always enabled.</p></div>
            <Switch checked disabled aria-label="Essential cookies, always enabled" />
          </div>
          <div className="flex items-start justify-between gap-4 py-4">
            <div><label htmlFor="cookie-analytics" className="text-sm font-semibold">Analytics</label><p id="cookie-analytics-description" className="mt-1 text-xs leading-relaxed text-muted-foreground">Optional usage measurement. No optional analytics tracking is currently installed.</p></div>
            <Switch id="cookie-analytics" aria-describedby="cookie-analytics-description" checked={analytics} onCheckedChange={setAnalytics} />
          </div>
          <div className="flex items-start justify-between gap-4 py-4">
            <div><label htmlFor="cookie-marketing" className="text-sm font-semibold">Marketing</label><p id="cookie-marketing-description" className="mt-1 text-xs leading-relaxed text-muted-foreground">Optional advertising measurement. No marketing tracking is currently installed.</p></div>
            <Switch id="cookie-marketing" aria-describedby="cookie-marketing-description" checked={marketing} onCheckedChange={setMarketing} />
          </div>
        </div>
        <PolicyLinks onNavigate={closeSettings} />
        {error && <p role="alert" className="text-sm">{error}</p>}
        <Button variant="outline" className="min-h-11" onClick={() => saveConsent({ analytics, marketing })}>Save Preferences</Button>
      </DialogContent>
    </Dialog>
  </>;
}