// Backend-only switch. Only deployment administrators can set this environment value.
// Enabling requires founder approval and a separate credential/security review.
export function mtAutoSyncEnabled(): boolean {
  try {
    return Deno.env.get('MT5_AUTO_SYNC_ENABLED') === 'true';
  } catch {
    return false;
  }
}

export function assertMtAutoSyncEnabled(): void {
  if (!mtAutoSyncEnabled()) throw new Error('mt_auto_sync_disabled');
}

export function mtDisabledResponse(headers: HeadersInit): Response | null {
  if (mtAutoSyncEnabled()) return null;
  return new Response(JSON.stringify({ error: 'mt_auto_sync_disabled', message: 'MT5 Auto Sync is coming soon.' }), {
    status: 503,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
