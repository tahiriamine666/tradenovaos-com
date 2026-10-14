export function greetingFor(hour: number): string {
  return hour < 12 ? "Good morning" : "Good evening";
}

export function hourInZone(date: Date, timeZone?: string | null): number {
  if (timeZone) {
    try {
      const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(date);
      const n = parseInt(h, 10);
      if (!Number.isNaN(n)) return n % 24;
    } catch { /* invalid zone → local */ }
  }
  return date.getHours();
}

export function validZone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return undefined; }
}

export function greetingName(p: { display_name?: string | null; full_name?: string | null } | null): string {
  const d = p?.display_name?.trim();
  if (d) return d.split(/\s+/)[0];
  const f = p?.full_name?.trim().split(/\s+/)[0];
  return f || "";
}

export function dashboardGreeting(profile: Parameters<typeof greetingName>[0], date = new Date()): string {
  const name = greetingName(profile);
  return `Welcome back${name ? `, ${name}` : ""} — ${greetingFor(date.getHours())}`;
}
