# Replay Studio Upload Fix

## Root cause (verified against the live database)

The attached prompt claims three Supabase fixes are already in place. Two of them are **not** in the project:

1. Bucket `setup-screenshots` — **does not exist**. Only `avatars` and `trade-screenshots` exist.
2. Table `replay_screenshots` — **does not exist**. Only `replay_sessions` exists.
3. `replay_sessions` policies — already correct (`auth.uid() = user_id`, scoped to authenticated via `auth.uid()`).

The actual reason uploads fail today: `ReplayStudio.tsx` and `NewSessionModal.tsx` upload to `trade-screenshots` at path `replay/${user.id}/<uuid>.ext`. The bucket's RLS policy requires `(storage.foldername(name))[1] = auth.uid()::text` — i.e. the **first** folder must be the user's UUID. Because the first folder is the literal string `replay`, every insert is rejected by RLS and the upload silently fails.

To follow the attached prompt exactly, we must also provision the missing bucket and table.

## Plan

### 1. Database migration

- Create private bucket `setup-screenshots` (public = false).
- Add 4 `storage.objects` policies for `setup-screenshots` (SELECT/INSERT/UPDATE/DELETE) scoped to `authenticated` with `(storage.foldername(name))[1] = auth.uid()::text`.
- Create table `public.replay_screenshots`:
  - `id uuid pk`, `user_id uuid not null → auth.users`, `session_id uuid null → replay_sessions(id) on delete cascade`, `storage_path text not null`, `file_name text`, `file_size bigint`, `mime_type text`, `annotations jsonb default '[]'`, `order_index int default 0`, `created_at`, `updated_at`.
  - GRANTs: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role` (no `anon`).
  - Enable RLS, 4 policies: `auth.uid() = user_id` for all commands.
  - `updated_at` trigger using existing `public.set_updated_at()`.
  - Index on `(user_id, session_id, order_index)`.

### 2. Frontend changes (only Replay Studio files)

**`src/components/replay/NewSessionModal.tsx`**
- Switch upload bucket from `trade-screenshots` to `setup-screenshots`.
- Change storage path from `replay/${user.id}/<uuid>.ext` to `${user.id}/${Date.now()}-<rand>.ext` (satisfies RLS: first folder = user.id).
- After session insert succeeds, also insert a `replay_screenshots` row with `user_id`, `session_id`, `storage_path`, `file_name`, `file_size`, `mime_type`, `annotations: []`, `order_index: 0`.

**`src/pages/ReplayStudio.tsx`**
- Add `uploadReplayScreenshot(file, sessionId)` helper that exactly matches the attached prompt (path `${user.id}/<file>`, bucket `setup-screenshots`, signed URL, insert into `replay_screenshots`, validation for jpg/png/webp and 10 MB).
- Replace existing inline `uploadChart` with a call to that helper; on success patch `active.trades.chart_path` to the new path and set `imageUrl`.
- Update `signUrl()` to point at `setup-screenshots`. For backwards compatibility with sessions created before this fix, fall back to `trade-screenshots` when a signed URL on `setup-screenshots` is not available (covers historical paths starting with `replay/`).
- Keep all `replay_sessions` inserts/updates including `user_id` (already the case).
- Wire a `loadSessionScreenshots(sessionId)` call when active session changes, so reload shows any extra screenshots stored in `replay_screenshots` (currently we only use the single chart_path on `trades`).

**`src/components/replay/ChartCanvas.tsx`** (only if needed)
- Accept the new `uploading` boolean already passed in; no behavioural changes required beyond what the prompt's loading-state UI describes (the existing button already shows an uploading state — no redesign).

### 3. Out of scope (untouched)

- Trade Vault, Mind Journal, Learning Hub, Command Center, Edge Analytics, Playbook Lab, Landing, Pricing, Payments, Admin, Auth.
- `trade-screenshots` bucket and its policies (left intact for Trade Vault).
- `src/integrations/supabase/{client.ts,types.ts}` (types will regenerate after the migration).

### 4. Verification after build

1. Sign in, open Replay Studio → click **New Session** → upload PNG. Expect: success toast, session row created, screenshot row created in `replay_screenshots`, chart visible in canvas.
2. Hard reload `/app` route → screenshot still renders (signed URL refreshed on mount).
3. `psql` checks: `select count(*) from replay_screenshots where user_id = <uid>` returns expected count; storage object path begins with the user's UUID.
4. Second user cannot list or download the first user's object (RLS).
5. Invalid file type / >10 MB → toast error, no upload.

## Deliverables in the final reply

1. Root cause found (above).
2. Files changed: migration + `ReplayStudio.tsx` + `NewSessionModal.tsx` (+ tiny ChartCanvas tweak if required).
3. RLS policies affected: 4 new `storage.objects` policies for `setup-screenshots`, 4 new policies on `replay_screenshots`. No existing policies modified.
4. Upload flow verification: path layout, signed-URL fetch, DB insert.
5. Final testing results from the steps above.
