// Per-review-id save queue. Each review id owns its own draft, base revision,
// in-flight promise and edit generation, so a save started for one review can
// never write into (or be merged into) another. Failed and conflicted drafts are
// retained in memory until they are saved or the user explicitly reloads.
// There is no automatic retry: a rejected save stops until the next edit,
// an explicit Save, or Retry.

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
export type Draft = { answers: Record<string, string>; action_plan: Record<string, string>; ratings: Record<string, number | null> };
export type ServerMeta = { revision: number; completion_pct: number; status: string; updated_at: string };
export type SaveResult = ({ ok: true } & ServerMeta) | { ok: false; kind: 'error' | 'conflict'; message?: string };
export type SaveFn = (id: string, baseRevision: number, draft: Draft) => Promise<SaveResult>;

export type Entry = {
  id: string; revision: number; draft: Draft; meta: Omit<ServerMeta, 'revision'>;
  dirty: boolean; status: SaveState; gen: number; inFlight: Promise<boolean> | null; message?: string;
};

export class ReviewSaveQueue {
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  constructor(private save: SaveFn) {}

  setSaver(save: SaveFn) { this.save = save; }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify() { this.listeners.forEach((l) => l()); }
  get(id: string | null | undefined) { return id ? this.entries.get(id) ?? null : null; }
  /** Entries holding changes that are not on the server (dirty, failed or conflicted). */
  unsaved() { return [...this.entries.values()].filter((e) => e.dirty || e.status === 'error' || e.status === 'conflict'); }
  isBusy() { return [...this.entries.values()].some((e) => e.inFlight); }

  /** Accepts a server row. Never replaces a local unsaved or in-flight draft, and never moves revision backwards. */
  load(row: { id: string; revision: number; draft: Draft } & Omit<ServerMeta, 'revision'>): Entry {
    const cur = this.entries.get(row.id);
    if (cur && (cur.dirty || cur.inFlight || cur.status === 'error' || cur.status === 'conflict' || cur.revision > row.revision)) return cur;
    const e: Entry = { id: row.id, revision: row.revision, draft: row.draft, meta: { completion_pct: row.completion_pct, status: row.status, updated_at: row.updated_at },
      dirty: false, status: cur?.status === 'saved' ? 'saved' : 'idle', gen: cur?.gen ?? 0, inFlight: null };
    this.entries.set(row.id, e); this.notify(); return e;
  }

  /** Explicit user choice after a conflict: replace the local draft with the server copy. */
  replaceWithServer(row: { id: string; revision: number; draft: Draft } & Omit<ServerMeta, 'revision'>) {
    const cur = this.entries.get(row.id);
    if (cur?.inFlight) return false;
    this.entries.delete(row.id); this.load(row); return true;
  }

  edit(id: string, fn: (d: Draft) => Draft) {
    const e = this.entries.get(id); if (!e) return;
    e.draft = fn(e.draft); e.dirty = true; e.gen++;
    if (e.status !== 'conflict' && !e.inFlight) e.status = 'idle';
    this.notify();
  }

  /** Saves the latest snapshot of one review. Resolves true only when the server holds every edit. */
  async flush(id: string): Promise<boolean> {
    const e = this.entries.get(id); if (!e) return true;
    if (e.inFlight) return e.inFlight;
    if (e.status === 'conflict') return false;
    if (!e.dirty) return e.status !== 'error';
    // Assign the lock before notifying subscribers or calling the transport.
    const run = Promise.resolve().then(async () => {
      while (e.dirty) {
        const gen = e.gen, snapshot = e.draft, base = e.revision;
        e.status = 'saving'; e.message = undefined; this.notify();
        try {
          const res = await this.save(id, base, snapshot);
          if (res.ok === false) { e.status = res.kind; e.message = res.message; return false; }
          e.revision = res.revision;
          e.meta = { completion_pct: res.completion_pct, status: res.status, updated_at: res.updated_at };
          if (e.gen === gen) e.dirty = false;
        } catch (err) {
          e.status = 'error'; e.message = err instanceof Error ? err.message : undefined; return false;
        }
      }
      e.status = 'saved'; return true;
    }).finally(() => { e.inFlight = null; this.notify(); });
    e.inFlight = run;
    return run;
  }

  async flushAll(): Promise<boolean> {
    const ids = [...this.entries.values()].filter((e) => e.dirty || e.inFlight).map((e) => e.id);
    const res = await Promise.all(ids.map((id) => this.flush(id)));
    return res.every(Boolean) && this.unsaved().length === 0;
  }
}

// One queue per signed-in user, kept at module level so drafts survive the
// Journal tab unmounting the review panel and account switches.
const queues = new Map<string, ReviewSaveQueue>();
export function getReviewQueue(userId: string, save: SaveFn) {
  let q = queues.get(userId);
  if (!q) { q = new ReviewSaveQueue(save); queues.set(userId, q); } else q.setSaver(save);
  return q;
}
