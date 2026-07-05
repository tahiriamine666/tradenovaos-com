// Emoji flag from ISO-2 country code.
export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const cc = (code || "").toUpperCase();
  const flag = cc.length === 2
    ? String.fromCodePoint(...cc.split("").map((c) => 127397 + c.charCodeAt(0)))
    : "🏳️";
  return <span className={className} aria-label={cc}>{flag}</span>;
}
