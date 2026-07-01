# Replay Studio — Fullscreen Chart + Honest Replay UX

Scope: layout/fullscreen fix and UX cleanup only. We keep the current TradingView public widget (per your choice) and stop pretending the external controls step candles on the chart — because the widget is an iframe with no JS API for that. TradingView's own built-in **Bar Replay** button (already inside its toolbar) remains the way to replay candles.

## What changes

### 1. Fullscreen chart layout
- Replay Studio's active-session view switches to a true fullscreen workspace: the chart fills the viewport (minus the top bar), the right-hand tabs panel becomes a collapsible drawer instead of stealing 380px of chart width.
- Remove the hardcoded `h-[520px]` wrapper around `<TradingViewChart>` (ReplayStudio.tsx line 525).
- Chart container becomes `w-full h-full` inside a flex column that fills `100vh - header`. No fixed heights, no `max-h`, no `overflow` traps.
- `TradingViewChart` inner container already sets `height:100%;width:100%` and the widget uses `autosize: true`, so it will reflow. We add a `ResizeObserver` on the wrapper to re-init on drawer open/close.
- The custom Fullscreen button (Maximize2) already calls `requestFullscreen()`; we keep it and ensure the parent it targets is the full workspace, not just the chart card.

### 2. Reframe the replay controls (no false promises)
The Play/Pause/Step/Speed buttons already work as React state — they step through your logged executions (entries, partials, exits). They cannot advance chart candles because the widget is a black-box iframe. We make the UI match reality:
- Rename the control bar's context from "replay" to **"Execution playback"** so users understand it walks their trade log, not the chart.
- Add a small helper line: *"Use TradingView's Bar Replay button in the chart toolbar to rewind candles."*
- Progress bar and step counter now update whenever there are ≥1 executions (currently the tick requires ≥2 — fine, but we show `0 / 0` clearly instead of a dead 0%).
- Keep 1x / 2x / 5x / 10x / 20x — they already work; verify the tick interval math (`1500 / speed` ms) and clean up the `setInterval` on unmount / dep change.
- Add debug `console.log` for: playback start, pause, speed change, step advance, playback complete (removable behind a flag).
- Highlight the current execution row in the executions table and pulse the matching marker chip in the strip when the tick advances.

### 3. Execution markers empty state
The message *"No execution markers yet…"* is not a bug — it renders only when the session has 0 rows in `replay_executions`. We make it more useful:
- Show a small illustrated empty state with an "Add first execution" button that opens the add-row form directly (currently that form sits below and is easy to miss).
- When ≥1 execution exists, the strip renders normally (entry / SL / TP / partial / exit chips, already color-coded). No on-chart overlay — impossible with the iframe.

### 4. Right panel becomes a slide-over
- Details / Notes / AI Review / Playbook tabs move into a right-side drawer that opens over the chart instead of splitting the grid. Chart reclaims that 380px.
- A persistent "Session panel" button (top-right of chart) toggles it. Closed by default when the viewport is narrower than `lg`.

### 5. Cleanup
- Remove the dead `ReplayControls.tsx` (superseded by `ReplayControlBar.tsx`) if unused.
- Fix the `React.useEffect` dep list on the playback tick to include the setter references it uses, silencing the eslint-disable already implied.

## What we deliberately do NOT do
- No swap to `lightweight-charts`. That was the only path to real programmatic bar replay and on-chart markers, and you chose to keep the widget.
- No new data source, no Binance/Yahoo adapter (that was tied to the rewrite path).
- No changes to session data model, RLS, or edge functions.

## Files touched

```text
src/pages/ReplayStudio.tsx              layout: fullscreen workspace, drawer for tabs, remove h-[520px]
src/components/replay/TradingViewChart.tsx  h-full sizing, ResizeObserver, fullscreen target
src/components/replay/ReplayControlBar.tsx  rename, helper text, debug logs, cleanup deps
src/components/replay/MarkerStrip.tsx        richer empty state with CTA
src/components/replay/ExecutionsTable.tsx    highlight current row on tick
src/components/replay/ReplayControls.tsx     delete if unused
```

## Verification
- Chart fills viewport on 1280×800, 1440×900, 1920×1080 — no gray band below.
- Fullscreen button enters browser fullscreen filling the screen.
- With a session that has ≥2 executions: Play advances step, Pause halts, Step ±1 moves one row, speed pills change tick rate, progress % updates, current row highlights.
- With a session that has 0 executions: empty state shows CTA, no dead 0% bar.
- Right-panel drawer opens/closes without resizing the chart iframe (it stays full width).

## Note on expectations
"Candles advance in replay" and "trade markers display on the chart" from your spec require the lightweight-charts rewrite. With the widget kept, candle stepping stays inside TradingView's own Bar Replay UI, and our markers stay as chips below the chart. If you want on-chart markers and programmatic candle stepping later, that's the follow-up rewrite.
