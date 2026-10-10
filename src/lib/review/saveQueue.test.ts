import { describe, expect, it, vi } from 'vitest';
import { ReviewSaveQueue, type SaveResult } from './saveQueue';

const draft = () => ({ answers: {}, action_plan: {}, ratings: {} });
const row = (id: string, revision = 0) => ({ id, revision, draft: draft(), completion_pct: 0, status: 'draft', updated_at: '' });
const ok = (revision: number): SaveResult => ({ ok: true, revision, completion_pct: 0, status: 'draft', updated_at: 'x' });
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

describe('ReviewSaveQueue', () => {
  it('network rejection makes exactly one call and keeps the draft', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const q = new ReviewSaveQueue(save); q.load(row('a'));
    q.edit('a', (d) => ({ ...d, answers: { did_well: 'x' } }));
    expect(await q.flush('a')).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(save).toHaveBeenCalledTimes(1);
    expect(q.get('a')!.status).toBe('error');
    expect(q.get('a')!.dirty).toBe(true);
    expect(q.get('a')!.draft.answers.did_well).toBe('x');
  });

  it('edit during a deferred save triggers one follow-up with the newest snapshot and new revision', async () => {
    const d1 = deferred<SaveResult>();
    const save = vi.fn().mockReturnValueOnce(d1.promise).mockResolvedValueOnce(ok(2));
    const q = new ReviewSaveQueue(save); q.load(row('a'));
    q.edit('a', (d) => ({ ...d, answers: { did_well: '1' } }));
    const p = q.flush('a');
    await Promise.resolve();
    q.edit('a', (d) => ({ ...d, answers: { did_well: '2' } }));
    d1.resolve(ok(1));
    expect(await p).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1]).toBe(1);
    expect(save.mock.calls[1][2].answers.did_well).toBe('2');
    expect(q.get('a')!.dirty).toBe(false);
  });

  it('switching identity while saving never merges into the other review', async () => {
    const d1 = deferred<SaveResult>();
    const save = vi.fn().mockReturnValueOnce(d1.promise);
    const q = new ReviewSaveQueue(save); q.load(row('a')); q.load(row('b', 5));
    q.edit('a', (d) => ({ ...d, answers: { did_well: 'A' } }));
    const p = q.flush('a');
    q.load(row('b', 5)); // user navigated to b
    d1.resolve(ok(1)); await p;
    expect(q.get('b')!.revision).toBe(5);
    expect(q.get('b')!.draft.answers).toEqual({});
    expect(q.get('a')!.revision).toBe(1);
  });

  it('conflict stops saving, blocks navigation and keeps the draft; reloading the server row does not clobber it', async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, kind: 'conflict' });
    const q = new ReviewSaveQueue(save); q.load(row('a'));
    q.edit('a', (d) => ({ ...d, answers: { did_well: 'mine' } }));
    expect(await q.flushAll()).toBe(false);
    expect(await q.flush('a')).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    q.load(row('a', 3)); // reopening / [version] reload
    expect(q.get('a')!.draft.answers.did_well).toBe('mine');
    q.replaceWithServer(row('a', 3));
    expect(q.get('a')!.draft.answers).toEqual({});
  });

  it('reopening a saved review accepts the newer server row but never an older revision', async () => {
    const q = new ReviewSaveQueue(vi.fn().mockResolvedValue(ok(4)));
    q.load(row('a', 3)); q.edit('a', (d) => ({ ...d, answers: { x: '1' } }));
    await q.flush('a');
    q.load(row('a', 2));
    expect(q.get('a')!.revision).toBe(4);
    q.load({ ...row('a', 6), draft: { answers: { x: 'server' }, action_plan: {}, ratings: {} } });
    expect(q.get('a')!.draft.answers.x).toBe('server');
  });
});
