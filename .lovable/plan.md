## TradeDrawer Theme Fix (Light + Dark Mode)

Make the `TradeDrawer` component in `src/pages/TradeVault.tsx` fully theme-aware by replacing every hardcoded dark value with a `light dark:` Tailwind pair, per the uploaded spec.

### Scope
- File: `src/pages/TradeVault.tsx` — only the `TradeDrawer` function (no other component touched).

### Swap rules (applied across entire TradeDrawer)

**Backgrounds**: `bg-[#0d0d1f]` → `bg-white dark:bg-[#0d0d1f]`; `bg-[#0c0c16]` → `bg-white dark:bg-[#0c0c16]`; `bg-[#0a0a18]` → `bg-background dark:bg-[#0a0a18]`; `bg-black/60|40|30` → light counterparts (`bg-black/10|5`) with `dark:` original.

**White-opacity surfaces**: `bg-white/[0.02..0.06]` → slate-50/100/200 light variants with `dark:bg-white/[0.0x]`.

**Borders**: all `border-white/[0.06..0.15]` → `border-border dark:border-white/[0.0x]`.

**Text**: `text-white` → `text-foreground dark:text-white`; `text-white/20..70` → `text-muted-foreground/30..75` (or `text-foreground/70..75` for higher opacities) with `dark:text-white/x`.

**Inline-style dividers/backgrounds**: replace `rgba(255,255,255,0.06|0.08)` and `rgba(10,10,24,1)` with Tailwind `border-border` / `bg-background`.

### Specific structural fixes
1. Backdrop overlay → `bg-black/10 dark:bg-black/60` + lighter backdrop-blur in light.
2. Drawer panel — drop inline gradient background; use `bg-white dark:bg-gradient-to-br dark:from-[#0d0d1f] dark:to-[#0a0a18] border-l border-border dark:border-white/[0.08]`. Keep boxShadow (softer in light).
3. Header border → Tailwind `border-b border-border` (remove inline style).
4. 6 quick stat cards — fix only neutral white-opacity slots; keep colored emerald/red/blue/violet/amber/cyan/pink as-is.
5. Price bar wrapper → `bg-slate-50 dark:bg-white/[0.02]`.
6. Tabs row → `bg-muted border border-border`.
7. Tab content cards (Notes/Mistakes/AI/Playbook) → `bg-card border border-border`.
8. Bottom actions gradient → `bg-gradient-to-t from-background via-background/80 to-transparent border-t border-border`.
9. Header Close/Edit buttons → `border-border text-muted-foreground hover:bg-muted hover:text-foreground`.
10. Notes empty state → `bg-muted border border-border`.
11. Screenshots empty state → `border-dashed border-border bg-muted/30`.
12. Score circles card → `border-border bg-card`.
13. AI re-analyze button → muted-foreground / hover bg-muted.
14. Duplicate/Delete buttons → same muted treatment.

### Out of scope (untouched)
- Colored tokens (emerald/red/blue/violet/amber/cyan/pink) — already work in both modes.
- Purple accent line at top, win/loss glow logic.
- `AddTradeModal`, `TradeRow`, main `TradeVault` body, Supabase queries, screenshot upload.

### Verification
After edits, the drawer should render: white panel + slate cards + slate borders + slate/muted text in light mode; unchanged dark-glass aesthetic in dark mode. No regressions to colored badges or win/loss glow.
