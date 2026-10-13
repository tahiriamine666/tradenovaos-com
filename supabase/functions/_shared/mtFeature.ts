/** Deployment-admin controlled. Missing, malformed or unreadable config fails closed. */
export function mtAutoSyncEnabled(): boolean {
  try { return Deno.env.get('MT_AUTO_SYNC_ENABLED') === 'true'; }
  catch { return false; }
}

export function assertMtAutoSyncEnabled(): void {
  if (!mtAutoSyncEnabled()) throw new Error('MT5 Auto Sync is coming soon');
}

export function mtAutoSyncLockdown(headers: HeadersInit): Response | null {
  if (mtAutoSyncEnabled()) return null;
  return new Response(JSON.stringify({
    ok: false, code: 'MT_AUTO_SYNC_DISABLED', error: 'MT5 Auto Sync is coming soon',
  }), { status: 503, headers: { ...Object.fromEntries(new Headers(headers)), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
