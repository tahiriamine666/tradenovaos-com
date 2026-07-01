import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const VALID_PLANS = ['free', 'pro', 'elite'] as const;
const VALID_STATUSES = ['active', 'trialing', 'inactive', 'canceled', 'past_due'] as const;

interface Body {
  user_id?: string;
  email?: string;
  plan: string;
  status?: string;
  trial_days?: number;
  notes?: string | null;
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return bad(405, 'Method not allowed');

  try {
    // ─── Auth ─────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return bad(401, 'Unauthorized');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return bad(401, 'Invalid session');

    const adminId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ─── Admin check ─────────────────────────────────────
    const { data: isAdminRow } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', adminId)
      .maybeSingle();
    if (!isAdminRow) return bad(403, 'Admin access required');

    // ─── Parse + validate ────────────────────────────────
    let body: Body;
    try { body = await req.json(); } catch { return bad(400, 'Invalid JSON'); }

    const plan = String(body.plan ?? '').toLowerCase();
    const status = String(body.status ?? (plan === 'free' ? 'inactive' : 'active')).toLowerCase();
    // Elite has no free trial — force trial_days = 0 regardless of caller input.
    const rawTrialDays = Math.max(0, Math.min(365, Number(body.trial_days ?? 0) | 0));
    const trialDays = plan === 'elite' ? 0 : rawTrialDays;
    const notes = body.notes?.toString().slice(0, 2000) ?? null;

    if (!VALID_PLANS.includes(plan as any)) return bad(400, 'Invalid plan');
    if (!VALID_STATUSES.includes(status as any)) return bad(400, 'Invalid status');

    // ─── Resolve target user ─────────────────────────────
    let targetUserId = body.user_id ?? null;
    let targetEmail: string | null = body.email ?? null;

    if (!targetUserId && targetEmail) {
      const { data: prof } = await admin
        .from('profiles')
        .select('id, email')
        .ilike('email', targetEmail)
        .maybeSingle();
      if (!prof) return bad(404, 'User not found');
      targetUserId = prof.id;
      targetEmail = prof.email;
    } else if (targetUserId) {
      const { data: prof } = await admin
        .from('profiles')
        .select('email')
        .eq('id', targetUserId)
        .maybeSingle();
      targetEmail = prof?.email ?? null;
    } else {
      return bad(400, 'user_id or email is required');
    }

    // ─── Build update payload ────────────────────────────
    const effectiveStatus =
      plan === 'free' ? 'inactive' : (trialDays > 0 ? 'trialing' : status);

    const update: Record<string, unknown> = {
      plan_type: plan,
      subscription_plan: plan,
      subscription_status: effectiveStatus,
      trial_ends_at: trialDays > 0
        ? new Date(Date.now() + trialDays * 86400_000).toISOString()
        : null,
      upgraded_manually: plan !== 'free',
      upgraded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: updErr } = await admin
      .from('profiles')
      .update(update)
      .eq('id', targetUserId);

    if (updErr) {
      console.error('[admin-manage-subscription] profile update failed', {
        adminId, targetUserId, plan, status: effectiveStatus,
        code: updErr.code, message: updErr.message, details: updErr.details,
      });
      return bad(500, 'Failed to update subscription. Please try again.');
    }

    console.log('[admin-manage-subscription] updated subscription:', {
      userId: targetUserId, email: targetEmail, plan, status: effectiveStatus, trialDays,
    });

    // ─── Audit log ───────────────────────────────────────
    const { error: logErr } = await admin.from('subscription_overrides').insert({
      user_id: targetUserId,
      admin_id: adminId,
      plan,
      status: effectiveStatus,
      trial_days: trialDays,
      notes,
    });
    if (logErr) {
      console.error('[admin-manage-subscription] audit insert failed', logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User upgraded successfully',
        user_id: targetUserId,
        email: targetEmail,
        plan,
        status: effectiveStatus,
        trial_days: trialDays,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[admin-manage-subscription] unexpected error', e);
    return bad(500, 'Unexpected server error');
  }
});
