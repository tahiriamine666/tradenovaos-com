# Remove old heatmap card from Dashboard

The uploaded screenshot is the small "Trading Calendar — Daily P&L heatmap" card inside the Command Center on the Dashboard. Since the real Trading Calendar already sits below the Command Center, this card is redundant.

## Change

- `src/components/CommandCenter.tsx`
  - Remove the `CalendarHeatmap` component and its render block in the "Calendar + Trader Score" grid.
  - Let `TraderScoreCard` take the full row width instead (grid becomes one full-width card).
  - Remove now-unused imports (e.g. `ChevronLeft`, `ChevronRight`) if nothing else uses them.

## Verification

- Build passes (check `/tmp/observability/build-errors.log`).
- Preview: Dashboard shows the Command Center without the heatmap card, Trader Score card full width, real Trading Calendar still below.
