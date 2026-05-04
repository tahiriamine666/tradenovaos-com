// ─── dateUtils.ts ─────────────────────────────────────────────────────────────
// Fix trade_date timezone bug + date formatting helpers

/**
 * PROBLEM: new Date('2024-03-15') parses as UTC midnight → local timezone
 * shifts it to Mar 14 for UTC-X users.
 *
 * SOLUTION: always append T12:00:00 to date-only strings so local timezone
 * offset never crosses a day boundary.
 */
export function parseTradeDateSafe(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Already has time component — don't touch
  if (dateStr.includes('T') || dateStr.includes(' ')) return new Date(dateStr);
  // Date-only string — append midday to avoid timezone shift
  return new Date(`${dateStr}T12:00:00`);
}

/**
 * Format a trade_date string to a readable label.
 * Safe against timezone offset.
 */
export function formatTradeDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const d = parseTradeDateSafe(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString(undefined, options);
}

/**
 * Get day number from trade_date safely (used in TradingCalendar).
 */
export function getTradeDateDay(dateStr: string): number {
  return parseTradeDateSafe(dateStr).getDate();
}

/**
 * Convert Date to YYYY-MM-DD string for DB insert.
 */
export function toDBDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Today as YYYY-MM-DD.
 */
export function todayDBDate(): string {
  return toDBDate(new Date());
}
