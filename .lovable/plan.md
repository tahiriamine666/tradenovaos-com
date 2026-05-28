## Goal
Replace `src/pages/LearningHub.tsx` with the premium trading-education layout from the uploaded prompt, plus the backend it actually needs to work.

## What ships

### 1. DB migration — three new tables
The pasted UI reads/writes tables that don't exist yet.

- **`lessons`** (public catalog, readable by everyone)
  - `id uuid pk`, `slug text unique`, `title text`, `description text`,
    `category text`, `subcategory text`, `difficulty text` (beginner/intermediate/advanced),
    `read_time_min int`, `tags text[]`, `xp_reward int default 50`,
    `order_index int default 0`, `is_premium bool default false`,
    `thumbnail_url text`, `created_at timestamptz`
  - GRANT SELECT to `anon` + `authenticated`, ALL to `service_role`
  - RLS: `select` policy `using (true)` (public catalog)

- **`lesson_progress`** (per user)
  - `id uuid pk`, `user_id uuid not null`, `lesson_id uuid not null`,
    `progress_pct int default 0`, `completed bool default false`,
    `saved bool default false`, `notes text`,
    `completed_at timestamptz`, `updated_at timestamptz default now()`,
    `unique (user_id, lesson_id)`
  - GRANT to `authenticated` + `service_role` (no anon)
  - RLS: own-row select/insert/update/delete using `auth.uid() = user_id`

- **`learning_stats`** (per user, 1 row)
  - `user_id uuid pk`, `xp_total int default 0`, `streak_days int default 0`,
    `hours_studied numeric default 0`, `current_focus text`,
    `last_study_date date`, `updated_at timestamptz default now()`
  - Same grants/RLS pattern as `lesson_progress`

- **Seed** ~20-25 lessons across the 8 categories (ICT Concepts, SMC, Price Action, Fundamentals, Risk Management, Trading Psychology, Prop Firm Strategies, Replay Drills) with realistic titles, descriptions, tags, difficulty, read_time, xp_reward — so the page isn't empty on first load.

### 2. New edge function — `ai-learning-assistant`
The pasted `AIAssistant` calls `api.anthropic.com` directly from the browser with no key — won't work and would leak a key. Replace with a Supabase edge function that uses the **Lovable AI Gateway** (`LOVABLE_API_KEY`, `google/gemini-2.5-flash`), takes `{ question }`, returns `{ answer }`. Verify JWT, handle 429/402 with friendly messages. Same pattern already used for `ai-replay-review`.

### 3. Replace `src/pages/LearningHub.tsx`
Paste the file from the prompt with two adjustments:
- Swap the direct Anthropic `fetch` in `AIAssistant.ask` for `supabase.functions.invoke('ai-learning-assistant', { body: { question: query } })`.
- Typing fixes for `Database` types: cast Supabase rows where needed (`as unknown as Lesson[]`), type `ease` as `[number,number,number,number]`, type the upsert payload `as any` to satisfy generated types.

Everything else (hero stats, AI recommendation bar, category strip, tabs, search, level filter, reset, lesson cards with thumbnail/progress/XP, load more, empty state, sidebar with AI Assistant + Your Progress + Top Students, weekly goal) ships as-is.

### 4. Wiring
`Index.tsx` already imports and renders `<LearningHub />` for `active === 'resources'` (verified). No router or sidebar change needed.

## Out of scope
- No changes to MindJournal, TradeVault, ReplayStudio, PlaybookLab, TradePlan, auth, dashboard, or any other page.
- Leaderboard "Top Students" stays as the static demo from the prompt (3 names) — turning it into a real leaderboard is a separate feature.
- Search bar in the top app header (separate from the in-page search) is unchanged.
- "Practice Drills" tab from the reference image isn't in the pasted code — keeping the 4 tabs the prompt actually ships (`All / In Progress / Completed / Saved`).

## Technical notes
- Migration order per project rules: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY, in that exact order, for each new public table.
- `learning_stats` upsert uses `onConflict: 'user_id'` — needs `user_id` as PK (or unique).
- Edge function deploys automatically; `verify_jwt = true` (default).
- Existing `LearningHub.tsx` (the small static lessons list) gets fully replaced — no migration of its hardcoded LESSONS array (the seeded DB rows take over).
