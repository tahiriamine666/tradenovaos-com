## Sidebar Cleanup + CSV Import Relocation

### 1. `src/components/AppLayout.tsx` — Update `BASE_ITEMS`
Remove the `import` entry and add a `calendar` entry. New order:

1. Command Center (`dashboard`)
2. Trade Plan (`plan`)
3. Trade Vault (`trades`)
4. Mind Journal (`journal`)
5. Edge Analytics (`analytics`)
6. Playbook Lab (`playbooks`)
7. Replay Studio (`replay`)
8. Learning Hub (`resources`)
9. Calendar (`calendar`) — icon `CalendarDays`
10. Studio Settings (`settings`)

(Admin Panel still appended dynamically for admins.)

Drop the `Upload` icon import since Import CSV is gone.

### 2. `src/pages/Index.tsx` — Routing
- Remove the `active === 'import'` block and the `CSVImport` import.
- Add `active === 'calendar'` that renders the existing `TradingCalendar` component (already defined in Index.tsx) in a simple page wrapper with a header.

### 3. `src/pages/TradeVault.tsx` — Add "Import Trades" button
In the header action group (currently View toggle + "Log Trade"), insert an `Import Trades` button to the left of `Log Trade`:

- Style: outline/secondary (border + muted bg) to keep "Log Trade" as the primary CTA.
- Icon: `Upload` from lucide-react.
- Behavior: opens a modal/dialog that renders the existing `<CSVImport onImportComplete={...} />` component. After import completes, close dialog and refresh trades via the existing fetch trigger (`useTradesChanged` already broadcasts; CSVImport's `onImportComplete` will call `fetchTrades`).

Implementation detail: add local `const [importOpen, setImportOpen] = useState(false)` and a shadcn `Dialog` wrapping `<CSVImport onImportComplete={() => { setImportOpen(false); fetchTrades(); }} />`.

### Out of scope
No changes to bottom mobile nav (already excludes `import`). No changes to LearningHub, no PDF/Drawdown work — the two attached prompts are unrelated to this sidebar request and will be handled separately if you ask.
