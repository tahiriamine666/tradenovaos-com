## Goal

Fill the 25 empty lessons with rich, trader-grade content using Lovable AI, then apply the small frontend safety fixes from the uploaded prompt so the LessonPage renders that content correctly.

## Why the upload alone isn't enough

The uploaded prompt assumes Supabase already has `content`, `key_takeaways`, `callouts`, and `quiz_questions` for every lesson. The DB has 25 rows — all empty on those fields. So no matter what the frontend does, the lesson view falls back to "Content being prepared". We need to generate and write the content first.

## Steps

### 1. Generate lesson content with Lovable AI (offline, one-time)

Run a sandbox script (`code--exec` + `lovable_ai.py` skill) that:

- Reads all 25 lessons (`id, slug, title, category, subcategory, difficulty, tags, read_time_min`).
- For each lesson, calls `google/gemini-2.5-pro` via the AI Gateway with a structured tool schema that returns:
  - `content` — markdown body (~600–1100 words) using `## headings`, `**bold**`, `- bullets`, `1. numbered`, and the spec's `| table |` syntax. Real trading detail (e.g. for "ICT Liquidity Concepts" → buy-side/sell-side liquidity, stop hunts, examples on NAS100/Gold).
  - `key_takeaways` — 5–7 short strings.
  - `callouts` — 2–3 items, each `{ type: 'tip'|'warning'|'important', title, text }`.
  - `quiz_questions` — 4 items, each `{ id, question, options[4], correct, explanation }`.
- Difficulty-aware prompt (beginner vs intermediate vs advanced).
- Writes results to `/tmp/lessons_content.json`, then issues a single `UPDATE … FROM (VALUES …)` via the insert tool to populate all 25 rows in one shot.
- Includes a retry-on-429 with the script's built-in delay.

No schema change — `content`, `key_takeaways`, `callouts`, `quiz_questions` columns already exist.

### 2. Frontend safety fixes in `src/pages/LearningHub.tsx`

Apply the uploaded prompt's FIX 1–3 (FIX 4 — the full LessonPage rewrite — is already in place from the previous turn, so skip it):

- **FIX 1** — replace `supabase.from('lessons').select('*')` (line 854) with an explicit column list that includes `content, key_takeaways, sections, quiz_questions, callouts`. (Currently `select('*')` works, but being explicit guards against future schema drift and matches the spec.)
- **FIX 2** — change `openLesson` (line 932) to be `async` and re-fetch the full lesson by id from Supabase before navigating, so a freshly updated row never shows stale list data:
  ```ts
  const openLesson = async (l: Lesson) => {
    const { data } = await supabase.from('lessons').select('*').eq('id', l.id).single();
    setSelectedLesson((data as Lesson) ?? l);
    setView('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  ```
  Update the two call sites that don't await it (Continue button, related-lessons click) — fine to leave unawaited; React state still updates.
- **FIX 3** — `Lesson` interface and `Callout`/`QuizQuestion` types are already present from prior work; just verify and leave them.

### 3. Verify

- `psql` check: all 25 lessons now have non-empty `content`, ≥1 callout, ≥4 quiz questions, ≥5 takeaways.
- Preview: open 2–3 lessons across categories — content renders, callouts inject around H2 #2 and #4, takeaways grid shows, quiz tab functional.

## Not touching

Hub view, sidebar, leaderboard, AI tutor edge function, auth, routes, schema, RLS, or any other page. No new migration.

## Technical notes

- Script uses the bundled `lovable_ai.py` (copy from `knowledge://skill/ai-gateway/scripts/lovable_ai.py` to `/tmp/`), called per-lesson with `--schema` for structured JSON output.
- ~25 sequential calls @ ~1s delay ≈ 1–2 min. Output JSON is then merged into a single `UPDATE public.lessons SET … FROM (VALUES …) AS v(id, content, key_takeaways, callouts, quiz_questions) WHERE lessons.id = v.id::uuid;` via the data-change tool.
- `key_takeaways` is `text[]` — pass as Postgres array literal. `callouts` and `quiz_questions` are `jsonb` — pass as JSON strings cast to jsonb.
