// src/pages/AdminPanel.tsx
// Admin-only panel to manually upgrade/downgrade users.
// Only accessible if auth.uid() is in admin_users table.

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield, Search, Check, X, Clock, Crown,
  Zap, Rocket, RefreshCw, ChevronDown, AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  plan_type: string;
  subscription_status: string;
  trial_ends_at: string | null;
  upgraded_at: string | null;
  created_at: string;
}

interface UpgradeRequest {
  id: string;
  user_id: string;
  requested_plan: string;
  status: string;
  payment_method: string;
  payoneer_ref: string | null;
  user_message: string | null;
  created_at: string;
  profiles: { email: string; display_name: string | null };
}

const PLAN_COLORS: Record<string, string> = {
  free:  'bg-muted text-muted-foreground border-border',
  pro:   'bg-primary/10 text-primary border-primary/20',
  elite: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  active:   'text-emerald-500',
  trialing: 'text-blue-500',
  inactive: 'text-muted-foreground',
  canceled: 'text-red-500',
  past_due: 'text-amber-500',
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin]       = useState<boolean | null>(null);
  const [users,   setUsers]         = useState<UserRow[]>([]);
  const [requests, setRequests]     = useState<UpgradeRequest[]>([]);
  const [loading,  setLoading]      = useState(true);
  const [search,   setSearch]       = useState('');
  const [upgrading, setUpgrading]   = useState<string | null>(null);
  const [form, setForm]             = useState<{ userId: string; plan: string; days: string; notes: string } | null>(null);

  // Check admin status
  useEffect(() => {
    if (!user) return;
    supabase.from('admin_users').select('id').eq('id', user.id).single()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Fetch users + requests
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [usersRes, reqsRes] = await Promise.all([
      supabase.from('profiles')
        .select('id,email,display_name,plan_type,subscription_status,trial_ends_at,upgraded_at,created_at')
        .order('created_at', { ascending: false }),
      supabase.from('upgrade_requests')
        .select('*,profiles(email,display_name)')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    setUsers(usersRes.data ?? []);
    setRequests(reqsRes.data as any ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleUpgrade = async () => {
    if (!form) return;
    setUpgrading(form.userId);
    try {
      const { error } = await supabase.rpc('admin_upgrade_user', {
        target_user_id: form.userId,
        new_plan:       form.plan,
        trial_days:     Number(form.days) || 0,
        notes:          form.notes || null,
      });
      if (error) throw error;
      toast({ title: `User upgraded to ${form.plan}!` });
      setForm(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpgrading(null);
    }
  };

  const handleApproveRequest = async (req: UpgradeRequest) => {
    setUpgrading(req.id);
    try {
      // Upgrade user
      const { error: upErr } = await supabase.rpc('admin_upgrade_user', {
        target_user_id: req.user_id,
        new_plan:       req.requested_plan,
        trial_days:     14,
        notes:          `Approved from request ${req.id}. Payoneer ref: ${req.payoneer_ref ?? 'N/A'}`,
      });
      if (upErr) throw upErr;

      // Update request status
      await supabase.from('upgrade_requests')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', req.id);

      toast({ title: `Request approved — user upgraded to ${req.requested_plan}!` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpgrading(null);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    await supabase.from('upgrade_requests')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', reqId);
    toast({ title: 'Request rejected' });
    fetchData();
  };

  if (isAdmin === null || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="font-heading font-bold text-foreground">Admin Access Required</p>
        <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this page.</p>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const filtered = users.filter(u =>
    !search || u.email?.includes(search) || u.display_name?.includes(search)
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Admin Panel
          </h2>
          <p className="text-muted-foreground text-sm">{users.length} users · {pendingRequests.length} pending requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-foreground' },
          { label: 'Pro Users',   value: users.filter(u => u.plan_type === 'pro').length,   color: 'text-primary' },
          { label: 'Elite Users', value: users.filter(u => u.plan_type === 'elite').length, color: 'text-amber-500' },
          { label: 'Pending',     value: pendingRequests.length,                             color: 'text-amber-500' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending upgrade requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Pending Upgrade Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{(req.profiles as any)?.email ?? req.user_id}</p>
                    <Badge variant="outline" className={`text-[10px] rounded-full capitalize border ${PLAN_COLORS[req.requested_plan]}`}>
                      → {req.requested_plan}
                    </Badge>
                  </div>
                  {req.payoneer_ref && <p className="text-xs text-muted-foreground font-mono">Ref: {req.payoneer_ref}</p>}
                  {req.user_message && <p className="text-xs text-muted-foreground">{req.user_message}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => handleApproveRequest(req)}
                    disabled={upgrading === req.id} className="rounded-lg h-8 text-xs gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRejectRequest(req.id)}
                    disabled={upgrading === req.id} className="rounded-lg h-8 text-xs gap-1.5">
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual upgrade form */}
      {form && (
        <Card className="border-0 shadow-sm border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm">Manual Upgrade</CardTitle>
            <CardDescription className="text-xs">Upgrading user: {users.find(u => u.id === form.userId)?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {['free','pro','elite'].map(p => (
                <button key={p} onClick={() => setForm(f => f ? { ...f, plan: p } : f)}
                  className={`py-2 rounded-xl border text-sm font-medium capitalize transition-all ${form.plan === p ? `${PLAN_COLORS[p]} border-current` : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Trial days (0 = immediate)</label>
                <Input type="number" value={form.days} onChange={e => setForm(f => f ? { ...f, days: e.target.value } : f)}
                  placeholder="0" className="rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                <Input value={form.notes} onChange={e => setForm(f => f ? { ...f, notes: e.target.value } : f)}
                  placeholder="Reason..." className="rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpgrade} disabled={!!upgrading} className="rounded-xl flex-1">
                Upgrade to {form.plan}
              </Button>
              <Button variant="outline" onClick={() => setForm(null)} className="rounded-xl">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-heading text-base">All Users</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search email..." className="pl-8 rounded-xl text-sm h-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] rounded-full capitalize border ${PLAN_COLORS[u.plan_type]}`}>{u.plan_type}</Badge>
                    <span className={`text-[10px] capitalize ${STATUS_COLORS[u.subscription_status] ?? 'text-muted-foreground'}`}>{u.subscription_status}</span>
                    {u.trial_ends_at && <span className="text-[10px] text-muted-foreground">Trial: {new Date(u.trial_ends_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline"
                  onClick={() => setForm({ userId: u.id, plan: u.plan_type, days: '0', notes: '' })}
                  className="rounded-lg h-7 text-xs flex-shrink-0">
                  Manage
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
