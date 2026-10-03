# Trade Plan history calendar

## What you’ll get
- A compact **Plan History** calendar near the top of Trade Plan, with month navigation, a today marker, and blue dots only on dates with saved plans.
- Selecting a saved date opens that date’s exact plan for review; **View Plan** and **Edit Plan** make the distinction clear. Previous/next day and **Back to Today** controls keep navigation simple.
- Selecting an empty historical date shows **“No Trade Plan saved for this day”** and **Create Plan**. Merely browsing never creates or changes a plan. Today opens normally with its existing blank/default editor when no plan exists; **Copy Previous Plan** is an explicit action only.
- Weekly Outlook follows the selected date’s Monday–Sunday week; Daily Outlook follows that exact day. Existing previous/current/next week controls and history remain available. Edits show a quiet Saving/Saved state and stay on their original date.

## Data safety
- Preserve every existing plan, checklist, scenario, note, rule, and selection. No migration, deletion, or fabricated historical data.
- A saved historical plan is read from `trade_plans` using the signed-in user and selected date; saves continue using the existing per-user/per-date key. Weekly and Daily Outlook continue to read and save separate dated records for the selected account, using their existing per-period keys.
- Make historical plans read-only until **Edit Plan** is chosen. When editing, save only modified fields against that same date so other saved fields and dates remain unchanged. Flush pending edits before navigating to another date; prevent stale responses or autosaves from changing the wrong date.
- Some older framework values may reside inside a saved plan rather than a dated Outlook record. Show those stored values when applicable without moving or overwriting them; never present invented values as saved history.

## Technical approach
- Extend the active `TradePlanWorkspace` and its existing dated-checklist child; add one small calendar component. Do not switch to the older, unused Trade Plan page or make the globally per-user plan account-specific.
- Fetch month markers from actual saved dates, scoped to the signed-in user; fetch the selected plan by date. Pass the selected date to both dated checklists, derive the weekly key from the Monday of that date, and keep manual week/day navigation intact.
- Keep the existing theme and controls, with a restrained 200–350ms date transition and no checkbox animations. Verify saved/empty dates, editing, date isolation, week boundaries, refresh, and desktop/mobile display in the signed-in preview.
