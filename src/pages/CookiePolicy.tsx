import { Link } from 'react-router-dom';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import SeoHead from '@/components/SeoHead';
import { CookieSettingsButton } from '@/components/CookieConsent';

export default function CookiePolicy() {
  return <div className="min-h-screen bg-background text-foreground">
    <SeoHead title="Cookie Policy — TradeNova OS" description="How TradeNova uses essential storage and remembers your optional cookie choices." path="/cookies" />
    <MarketingNav />
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="mb-3 text-sm text-muted-foreground">Privacy & security</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">Cookie Policy</h1>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <p>Cookies and browser storage can keep you signed in and remember your preferences. TradeNova separates essential storage from optional analytics and marketing. Optional consent is not required to use your account.</p>
        <section><h2 className="mb-2 text-lg font-semibold text-foreground">Essential — always enabled</h2><p>We use essential storage for authentication, session security, your cookie choice and app preferences such as account selection and display settings. These remain available when you select Essential Only. Changing cookie preferences does not sign you out or clear your trading data.</p></section>
        <section><h2 className="mb-2 text-lg font-semibold text-foreground">Analytics — optional</h2><p>No optional analytics tracking scripts are currently installed in the app. Your choice is remembered for future use. Any optional usage tracking added later must respect this category; materially different purposes require renewed consent.</p></section>
        <section><h2 className="mb-2 text-lg font-semibold text-foreground">Marketing — optional</h2><p>No marketing pixels or advertising trackers are currently installed in the app. We remember your choice without installing a tracker. Optional marketing tracking may only run with your permission.</p></section>
        <section><h2 className="mb-2 text-lg font-semibold text-foreground">Storage duration</h2><p>Your consent choice and its policy version stay in this browser’s local storage until you change them, clear site storage or a material policy change requires a new choice. Local app preferences also remain until cleared or updated. Temporary page preferences in session storage last for the browser tab’s session. Authentication storage follows the sign-in session lifecycle and is updated or cleared through session renewal and sign-out.</p><p className="mt-2">The consent record contains only the policy version, category choices and time of your decision—not your email, trading records or credentials. Choices are specific to this browser and site address.</p></section>
        <section><h2 className="mb-2 text-lg font-semibold text-foreground">Change your choice</h2><p>Open Cookie Settings below, in the footer, or in your account Settings at any time. Turning off an optional category withdraws permission for future optional tracking. You can also clear this site’s storage through your browser; clearing all site storage may sign you out.</p><CookieSettingsButton className="mt-4 min-h-11 border border-border" /></section>
        <p>For more information, see our <Link to="/privacy" className="text-foreground underline underline-offset-4">Privacy Policy</Link>.</p>
      </div>
    </main>
    <MarketingFooter />
  </div>;
}