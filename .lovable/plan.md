# Learning Hub V3 — Full Replacement

The uploaded spec replaces `src/pages/LearningHub.tsx` with a state-driven hub/lesson view. Two issues with the spec as-written must be addressed before/during implementation:

1. **Missing DB objects.** The spec references a `learning_categories` table, three `lessons` columns (`key_takeaways`, `sections`, `quiz_questions`), and a `get_leaderboard()` RPC — none exist in the current schema.
2. **Direct Anthropic call with no key.** `LessonAIAssistant` POSTs to `api.anthropic.com` from the browser with no Authorization header. This will fail and would expose any key if added. The project already has an `ai-learning-assistant` edge function wired to Lovable AI Gateway — we'll use that instead.

## Step 1 — Migration

Single migration creating the missing pieces:

- `learning_categories` table: `id`, `name` (unique, matches `lessons.category`), `emoji`, `gradient` (tailwind class string), `description`, `order_index`, timestamps. Public-read RLS (`USING (true)`), no write policies. GRANT `SELECT` to `anon`+`authenticated`, ALL to `service_role`.
- Add to `lessons`: `key_takeaways text[] default '{}'`, `sections jsonb default '[]'`, `quiz_questions jsonb default '[]'`.
- `get_leaderboard()` RPC: returns top 20 from `learning_stats` joined to `profiles` → `user_id, display_name, xp_total, streak_days, level` (level = `floor(xp_total/500)+1`). `SECURITY DEFINER`, `SET search_path = public`, GRANT EXECUTE to `authenticated`.
- Seed `learning_categories` with the distinct existing `lessons.category` values, default emoji `📚` and a neutral gradient (`from-slate-700 to-slate-500`) so the user can curate later.

## Step 2 — Replace `src/pages/LearningHub.tsx`

Drop the file in verbatim from the spec (lines 30–end of the uploaded prompt), with these required deviations:

- **AI assistant:** Replace the `fetch('https://api.anthropic.com/...')` block in `LessonAIAssistant.ask` with:
  ```ts
  const { data, error } = await supabase.functions.invoke('ai-learning-assistant', {
    body: { question: `${ctx}\n\nInstruction: ${prompt}` }
  });
  setAnswer(error ? 'Connection error. Try again.' : (data?.answer ?? 'Could not get response.'));
  ```
  No other change to that component.
- **Lesson select:** when loading a lesson, also select the new `key_takeaways, sections, quiz_questions` columns so the typed `Lesson` interface is satisfied.
- Keep all other spec behavior unchanged: hub/lesson view switching, breadcrumb, sections sidebar, tabs (Lesson/Examples/Practice/Notes/Resources), progress ring, prev/next within category, save/complete buttons, XP + streak via `learning_stats`, leaderboard via `get_leaderboard()` RPC.

## Step 3 — Verification

- Confirm `/app` Learning Hub loads, categories render, clicking a lesson opens the detail view, Back returns to hub.
- Confirm Save / Mark Completed persist via `lesson_progress`.
- Confirm AI quick-action returns a response through the edge function.

## Not touching

Route registration, `AppLayout`, auth, any other page, the `ai-learning-assistant` edge function itself, and the `lesson_progress` / `learning_stats` tables.
