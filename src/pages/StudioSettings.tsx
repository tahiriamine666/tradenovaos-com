import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Save, User, TrendingUp, Globe, Shield, AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { openCustomerPortal } from '@/lib/lemonsqueezy';

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
const TIMEZONES = [
  'UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+5:30',
  'UTC+6', 'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12',
  'UTC-1', 'UTC-2', 'UTC-3', 'UTC-4', 'UTC-5', 'UTC-6', 'UTC-7',
  'UTC-8', 'UTC-9', 'UTC-10', 'UTC-11', 'UTC-12',
];

const MARKETS = [
  'NASDAQ', 'S&P 500', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY',
  'Crypto', 'Oil (WTI)', 'DAX', 'Forex', 'Futures', 'Options',
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

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="font-heading text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5 space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground block">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StudioSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ── Fetch profile ──
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (err) {
      setError('Could not load your profile. Please refresh.');
      console.error('Profile fetch error:', err);
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Field setter ──
  const set = (key: keyof Profile, val: any) => {
    setProfile(prev => prev ? { ...prev, [key]: val } : prev);
    setSaved(false);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!profile || !user) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        display_name: profile.display_name,
        bio: profile.bio,
        timezone: profile.timezone,
        preferred_market: profile.preferred_market,
        risk_per_trade: profile.risk_per_trade,
        default_account_type: profile.default_account_type,
        trading_style: profile.trading_style,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (err) {
      setError('Failed to save changes. Please try again.');
      toast({ title: 'Error', description: 'Could not save profile.', variant: 'destructive' });
      console.error('Profile update error:', err);
    } else {
      setSaved(true);
      toast({ title: 'Profile saved', description: 'Your settings have been updated.' });
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  // ── Initials for avatar ──
  const initials = profile?.display_name || profile?.full_name
    ? (profile.display_name || profile.full_name || '')
        .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? 'U').toUpperCase();

  // ── Loading ──
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-heading text-foreground">Studio Settings</h2>
          <p className="text-muted-foreground text-sm">Your workspace profile</p>
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </motion.div>
    );
  }

  // ── Error ──
  if (error && !profile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-heading text-foreground">Studio Settings</h2>
        </div>
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium">Could not load profile</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="outline" className="ml-auto" onClick={fetchProfile}>Retry</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Studio Settings</h2>
          <p className="text-muted-foreground text-sm">Manage your workspace and trading preferences</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl"
        >
          {saved
            ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved</>
            : <><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</>
          }
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-0 border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Profile card (non-editable info) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground font-heading text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-heading font-bold text-foreground text-lg">
                {profile.display_name || profile.full_name || 'Trader'}
              </p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <Badge className="mt-1.5 bg-primary/10 text-primary border-0 capitalize text-xs">
                {profile.subscription_plan} plan
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Section icon={User} title="Personal Info" description="Your public trading identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Display Name" hint="Shown across the app">
            <Input
              value={profile.display_name ?? ''}
              onChange={e => set('display_name', e.target.value)}
              placeholder="e.g. Amine Trader"
              className="rounded-lg text-sm"
            />
          </Field>
          <Field label="Full Name">
            <Input
              value={profile.full_name ?? ''}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Your full name"
              className="rounded-lg text-sm"
            />
          </Field>
        </div>
        <Field label="Bio" hint="Optional — a short note about your trading approach">
          <Textarea
            value={profile.bio ?? ''}
            onChange={e => set('bio', e.target.value)}
            placeholder="e.g. Day trader focused on NASDAQ liquidity sweeps..."
            rows={2}
            className="text-sm resize-none rounded-lg"
          />
        </Field>
      </Section>

      {/* Trading preferences */}
      <Section icon={TrendingUp} title="Trading Preferences" description="Setup your default trading parameters">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Preferred Market">
            <select
              value={profile.preferred_market ?? ''}
              onChange={e => set('preferred_market', e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select market...</option>
              {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Risk Per Trade (%)" hint="Default risk used in position sizing">
            <Input
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              value={profile.risk_per_trade ?? 0.5}
              onChange={e => set('risk_per_trade', parseFloat(e.target.value))}
              className="rounded-lg text-sm"
            />
          </Field>
          <Field label="Account Type">
            <Select
              value={profile.default_account_type}
              onChange={v => set('default_account_type', v)}
              options={ACCOUNT_TYPES}
            />
          </Field>
          <Field label="Trading Style">
            <Select
              value={profile.trading_style}
              onChange={v => set('trading_style', v)}
              options={TRADING_STYLES}
            />
          </Field>
        </div>
      </Section>

      {/* Workspace settings */}
      <Section icon={Globe} title="Workspace" description="Timezone and display settings">
        <Field label="Timezone" hint="Used for trade date and calendar display">
          <select
            value={profile.timezone}
            onChange={e => set('timezone', e.target.value)}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Field>
      </Section>

      {/* Account info (read-only) */}
      <Section icon={Shield} title="Account" description="Subscription and security info">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Plan', value: profile.subscription_plan.charAt(0).toUpperCase() + profile.subscription_plan.slice(1) },
            { label: 'Email', value: profile.email ?? '—' },
            { label: 'Member since', value: new Date(profile?.['created_at' as keyof Profile] as string ?? '').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
          ].map(item => (
            <div key={item.label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
        <ManageBillingButton />
        <p className="text-xs text-muted-foreground">
          To change your email or password, use the account settings in your auth provider.
        </p>
      </Section>

      {/* Save button bottom */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-8">
          {saved
            ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved</>
            : <><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</>
          }
        </Button>
      </div>
    </motion.div>
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
      await openCustomerPortal();
    } catch (e: any) {
      toast({ title: 'Could not open billing portal', description: e?.message ?? 'Try again later', variant: 'destructive' });
    } finally {
      setOpening(false);
    }
  };

  if (loading) return null;

  if (hasSub) {
    return (
      <Button onClick={handleOpen} disabled={opening} variant="outline" className="rounded-xl">
        {opening
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening…</>
          : <><CreditCard className="h-4 w-4 mr-2" /> Manage billing <ExternalLink className="h-3 w-3 ml-2 opacity-60" /></>}
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
