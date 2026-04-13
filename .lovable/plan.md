

## Plan: Connect Edge Analytics to Real Supabase Data

### What changes

Replace the hardcoded analytics section (lines 587-614) with a data-driven view that fetches trades from Supabase and computes all requested metrics for the logged-in user.

### Steps

1. **Fetch trades when analytics tab is active** — query all trades for the user (reuse existing fetch pattern from dashboard). Store in local state with loading flag.

2. **Compute metrics client-side** from the fetched trades array:
   - Total P&L, Win Rate, Average Win, Average Loss, Best Trade, Worst Trade
   - Winning/Losing trade counts
   - Performance grouped by `side` (long/short) — count + total P&L per side
   - Performance grouped by `setup` — count + total P&L, filtering out empty/null setups

3. **Replace the 4 static MetricCards** with 8 metric cards (Total P&L, Win Rate, Avg Win, Avg Loss, Best Trade, Worst Trade, Winning Count, Losing Count).

4. **Replace the static "What works / What hurts" cards** with two new sections:
   - **Performance by Side** — a small table or card list showing Long vs Short stats
   - **Performance by Setup** — a table/card list showing each setup's count and P&L

5. **Add loading state** (Skeleton components) and **empty state** ("No trades yet" message).

6. **Format money** with `$` sign, commas, and `+`/`-` prefix based on value.

### Technical details

- Query: `supabase.from('trades').select('*').eq('user_id', user.id)` — fetch all trades once, compute everything client-side
- Trigger fetch via `useEffect` when `active === 'analytics'` changes or user changes
- Group-by logic uses `reduce()` to bucket by `side` and `setup`
- Keep existing `MetricCard` component and card styling
- No database changes needed

