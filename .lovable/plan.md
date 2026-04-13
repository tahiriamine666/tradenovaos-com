

## Plan: Connect Trading Calendar to Real Supabase Data

### What changes

The `TradingCalendar` component in `src/pages/Index.tsx` currently uses a hardcoded `calendarDays` array. We'll replace it with live data from the `trades` table, grouped by `trade_date`.

### Steps

1. **Update `TradingCalendar` component** to accept and use real trade data:
   - Add `useState` for current month/year navigation
   - Fetch trades for the displayed month from Supabase, filtered by `user_id`
   - Group trades by `trade_date`, calculating `sum(result)` and `count` per day
   - Dynamically compute the calendar grid based on the actual month (first day offset, days in month)
   - Display the real month/year label instead of hardcoded "March 2024"
   - Wire up the chevron buttons to navigate months

2. **Remove the static `calendarDays` array** from the top of the file.

3. **Handle states**:
   - Loading: show skeleton/spinner while fetching
   - Empty: days with no trades remain neutral (existing behavior)
   - Re-fetch when month changes or when trades are modified (pass a refresh trigger or use the existing pattern)

### Technical details

- Query: `supabase.from('trades').select('trade_date, result').eq('user_id', user.id).gte('trade_date', monthStart).lte('trade_date', monthEnd)`
- Group client-side by `trade_date` to compute daily P&L and trade count
- Calendar grid: compute `new Date(year, month, 1).getDay()` for offset, `new Date(year, month+1, 0).getDate()` for days in month
- Pass `useAuth()` user into the component or use it directly inside
- Keep all existing styling (green/red borders, dark mode classes)

### No database changes needed
RLS policies already exist on `trades` table scoping to `auth.uid() = user_id`.

