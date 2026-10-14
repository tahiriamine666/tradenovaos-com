import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Save, User, TrendingUp, Globe, Shield, AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TradingAccountsSection from '@/components/settings/TradingAccountsSection';
import ConnectionStatusSection from '@/components/settings/ConnectionStatusSection';
import Mt5ComingSoon from '@/components/settings/Mt5ComingSoon';
import { MT5_AUTO_SYNC_ENABLED } from '@/lib/featureFlags';
import ProfileEditDialog, { PROFILE_UPDATED_EVENT, emitProfileUpdated } from '@/components/settings/ProfileEditDialog';
import { Pencil } from 'lucide-react';
import { CookieSettingsButton } from '@/components/CookieConsent';


// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  timezone: string;
  preferred_market: string | null;
  risk_per_trade: number | null;
  default_account_type: string;
  trading_style: string;
  subscription_plan: string;
}

// ─── Option helpers ────────────────────────────────────────────────────────────
const TZ_LABELS: Record<string, string> = {
  'UTC-12': 'Baker Island', 'UTC-11': 'Pago Pago', 'UTC-10': 'Honolulu', 'UTC-9': 'Anchorage', 'UTC-8': 'Los Angeles',
  'UTC-7': 'Denver', 'UTC-6': 'Chicago', 'UTC-5': 'New York', 'UTC-4': 'Santiago / Halifax', 'UTC-3': 'São Paulo',
  'UTC-2': 'South Georgia', 'UTC-1': 'Azores', 'UTC': 'London', 'UTC+1': 'Casablanca / Central Europe', 'UTC+2': 'Athens / Cairo',
  'UTC+3': 'Moscow / Riyadh', 'UTC+4': 'Dubai', 'UTC+5': 'Karachi', 'UTC+5:30': 'Mumbai', 'UTC+6': 'Dhaka', 'UTC+7': 'Bangkok',
  'UTC+8': 'Singapore / Hong Kong', 'UTC+9': 'Tokyo', 'UTC+10': 'Sydney', 'UTC+11': 'Nouméa', 'UTC+12': 'Auckland',
};
const TIMEZONES = Object.keys(TZ_LABELS);
const tzLabel = (tz: string) => `${tz === 'UTC' ? 'UTC+0' : tz} — ${TZ_LABELS[tz] ?? tz}`;

const MARKETS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NAS100', 'US30', 'BTCUSD',
  'NASDAQ', 'S&P 500', 'DAX', 'Oil (WTI)', 'Crypto', 'Forex', 'Futures', 'Options',
];

const ACCOUNT_TYPES = [
  { value: 'live', label: 'Live Account' },
  { value: 'funded', label: 'Funded Challenge' },
  { value: 'demo', label: 'Demo Account' },
];

const TRADING_STYLES = [
  { value: 'scalping', label: 'Scalping' },
  { value: 'day_trading', label: 'Day Trading' },
  { value: 'swing', label: 'Swing Trading' },
  { value: 'position', label: 'Position Trading' },
];

const control = 'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, description, action, children, className = '' }: {
  icon: React.ElementType; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10"><Icon className="h-3.5 w-3.5 text-primary" /></span>
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={control}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/60 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudioSettings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [customMarket, setCustomMarket] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (err) { setError('Could not load your profile. Please refresh.'); console.error('Profile fetch error:', err); }
    else {
      setProfile(data as Profile);
      const m = (data as Profile).preferred_market;
      setCustomMarket(!!m && !MARKETS.includes(m));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => {
    const h = (e: Event) => setProfile(p => p ? { ...p, ...(e as CustomEvent).detail } : p);
    window.addEventListener(PROFILE_UPDATED_EVENT, h);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, h);
  }, []);

  const set = (key: keyof Profile, val: any) => { setProfile(prev => prev ? { ...prev, [key]: val } : prev); setSaved(false); setDirty(true); };

  const handleSave = async () => {
    if (!profile || !user) return;
    setSaving(true); setError(null);
    const { error: err } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      display_name: profile.display_name,
      bio: profile.bio,
      timezone: profile.timezone,
      preferred_market: profile.preferred_market,
      risk_per_trade: profile.risk_per_trade,
      default_account_type: profile.default_account_type,
      trading_style: profile.trading_style,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (err) {
      setError('Failed to save changes. Please try again.');
      toast({ title: 'Error', description: 'Could not save profile.', variant: 'destructive' });
      console.error('Profile update error:', err);
    } else {
      setSaved(true); setDirty(false);
      emitProfileUpdated({ display_name: profile.display_name, full_name: profile.full_name, bio: profile.bio, preferred_market: profile.preferred_market, trading_style: profile.trading_style });
      toast({ title: 'Settings saved', description: 'Your settings have been updated.' });
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const initials = profile?.display_name || profile?.full_name
    ? (profile.display_name || profile.full_name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? 'U').toUpperCase();

  const header = (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-foreground">Settings</h2>
      <p className="text-sm text-muted-foreground">Manage your profile, trading preferences, connected accounts and workspace.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {header}
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-44 rounded-lg" />)}</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {header}
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-card p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div><p className="text-sm font-medium text-foreground">Could not load profile</p><p className="mt-0.5 text-xs text-muted-foreground">{error}</p></div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={fetchProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const createdAt = (profile as any).created_at as string | undefined;
  const memberSince = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';
  const provider = (user?.app_metadata?.provider as string | undefined) ?? 'email';
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [provider];
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const tzOptions = TIMEZONES.includes(profile.timezone) ? TIMEZONES : [profile.timezone, ...TIMEZONES];

  const saveButton = (full = false) => (
    <Button onClick={handleSave} disabled={saving} className={`h-9 rounded-md ${full ? 'w-full sm:w-auto sm:px-8' : ''}`}>
      {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
        : saved ? <><CheckCircle2 className="mr-2 h-4 w-4" />Saved</>
        : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {header}
        <div className="flex items-center gap-3">
          {dirty && !saving && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          {saveButton()}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-card px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive" /><p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Profile overview */}
      <section role="button" tabIndex={0} onClick={() => setEditOpen(true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditOpen(true); } }}
        className="group flex cursor-pointer flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/40 sm:flex-row sm:items-center sm:p-5">
        <Avatar className="h-12 w-12">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profile photo" className="object-cover" />}
          <AvatarFallback className="bg-primary font-heading text-base text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-heading text-base font-semibold text-foreground">{profile.display_name || profile.full_name || 'Trader'}</p>
            <Badge className="border-0 bg-primary/10 text-[11px] capitalize text-primary">{profile.subscription_plan} plan</Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">
          <p className="uppercase tracking-wider">Member since</p>
          <p className="text-sm font-medium text-foreground">{memberSince}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary sm:self-center">
          <Pencil className="h-3 w-3" />Edit Profile
        </span>
      </section>
      <ProfileEditDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} markets={MARKETS} styles={TRADING_STYLES} />

      {/* Personal info */}
      <Section icon={User} title="Personal Info" description="Your trading identity across the app">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Display Name" hint="Shown across the app">
            <Input value={profile.display_name ?? ''} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Amine Trader" className={control} />
          </Field>
          <Field label="Full Name">
            <Input value={profile.full_name ?? ''} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" className={control} />
          </Field>
          <Field label="Bio" hint="Optional — a short note about your trading approach" className="sm:col-span-2">
            <Textarea value={profile.bio ?? ''} onChange={e => set('bio', e.target.value)} placeholder="e.g. Day trader focused on NASDAQ liquidity sweeps..." rows={2}
              className="resize-none rounded-md border-border bg-background text-sm focus-visible:ring-2 focus-visible:ring-primary/40" />
          </Field>
        </div>
      </Section>

      {/* Trading accounts */}
      {MT5_AUTO_SYNC_ENABLED ? (<><TradingAccountsSection /><ConnectionStatusSection /></>) : <Mt5ComingSoon />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trading preferences */}
        <Section icon={TrendingUp} title="Trading Preferences" description="Default trading parameters">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Preferred Market">
              <select value={customMarket ? '__custom' : (profile.preferred_market ?? '')} className={control}
                onChange={e => { if (e.target.value === '__custom') { setCustomMarket(true); set('preferred_market', ''); } else { setCustomMarket(false); set('preferred_market', e.target.value); } }}>
                <option value="">Select market...</option>
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom">Custom…</option>
              </select>
              {customMarket && <Input value={profile.preferred_market ?? ''} onChange={e => set('preferred_market', e.target.value.toUpperCase())} placeholder="e.g. GBPJPY" aria-label="Custom market" className={`${control} mt-2 font-mono`} />}
            </Field>
            <Field label="Risk Per Trade (%)" hint="Default risk used in position sizing">
              <Input type="number" min={0.1} max={100} step={0.1} value={profile.risk_per_trade ?? 0.5} onChange={e => set('risk_per_trade', parseFloat(e.target.value))} className={control} />
            </Field>
            <Field label="Account Type">
              <Select value={profile.default_account_type} onChange={v => set('default_account_type', v)} options={ACCOUNT_TYPES} />
            </Field>
            <Field label="Trading Style">
              <Select value={profile.trading_style} onChange={v => set('trading_style', v)} options={TRADING_STYLES} />
            </Field>
          </div>
        </Section>

        {/* Workspace */}
        <Section icon={Globe} title="Workspace" description="Timezone and display">
          <Field label="Timezone" hint="Used for trade dates and calendar display">
            <select value={profile.timezone} onChange={e => set('timezone', e.target.value)} className={control}>
              {tzOptions.map(tz => <option key={tz} value={tz}>{tzLabel(tz)}</option>)}
            </select>
          </Field>
        </Section>

        {/* Account & subscription */}
        <Section icon={CreditCard} title="Account & Subscription" description="Plan and billing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Info label="Plan" value={cap(profile.subscription_plan)} />
            <Info label="Email" value={profile.email ?? '—'} />
            <Info label="Member Since" value={memberSince} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ManageBillingButton />
            <Button variant="outline" className="h-9 rounded-md" onClick={() => signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </Section>

        {/* Security */}
        <Section icon={Shield} title="Privacy" description="Cookie preferences">
          <CookieSettingsButton className="min-h-11 border border-border" />
        </Section>
        <Section icon={Shield} title="Security" description="How you sign in">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="Sign-in method" value={providers.map(p => p === 'email' ? 'Email & password' : cap(p)).join(', ')} />
            <Info label="Last sign-in" value={lastSignIn} />
          </div>
          <p className="text-[11px] text-muted-foreground/80">To change your password, use “Forgot password” on the sign-in page.</p>
        </Section>
      </div>

      <div className="flex justify-end pb-4">{saveButton(true)}</div>
    </div>
  );
}

// ─── Manage Billing ──────────────────────────────────────────────────────────
function ManageBillingButton() {
  const { user } = useAuth();
  const [hasSub, setHasSub] = useState(false);
  const [upgradedManually, setUpgradedManually] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: sub }, { data: prof }] = await Promise.all([
        supabase
          .from('billing_subscriptions')
          .select('subscription_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('upgraded_manually')
          .eq('id', user.id)
          .maybeSingle(),
      ]);
      setHasSub(!!sub?.subscription_id);
      setUpgradedManually(!!prof?.upgraded_manually);
      setLoading(false);
    })();
  }, [user]);

  const handleOpen = async () => {
    try {
      setOpening(true);
      window.location.assign('/billing');
    } catch (e: any) {
      toast({ title: 'Could not open billing portal', description: e?.message ?? 'Try again later', variant: 'destructive' });
    } finally {
      setOpening(false);
    }
  };

  if (loading) return null;

  if (hasSub) {
    return (
      <Button onClick={handleOpen} disabled={opening} variant="outline" className="h-9 rounded-md">
        {opening
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening…</>
          : <><CreditCard className="h-4 w-4 mr-2" /> Manage billing</>}
      </Button>
    );
  }

  if (upgradedManually) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium text-foreground">Your plan was activated manually</p>
        <p className="text-xs text-muted-foreground mt-0.5">To make billing changes, contact support.</p>
      </div>
    );
  }

  return null;
}
