export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
