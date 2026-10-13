/** Anchor date for the weekly report opened from a calendar "Week" summary card (first in-month day of that row). */
export function weekCardAnchor(year: number, month: number, weekStartDay: number): Date {
  return new Date(year, month, Math.max(1, weekStartDay));
}

/** Weekly report anchor: a selected week card wins; otherwise today (clamped to the viewed month). */
export function weeklyReportAnchor(year: number, month: number, selectedWeekStart: number | null, today = new Date()): Date {
  if (selectedWeekStart != null) return weekCardAnchor(year, month, selectedWeekStart);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(today.getDate(), daysInMonth));
}
