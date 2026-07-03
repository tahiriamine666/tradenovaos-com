# Multi-Platform Trading Accounts

Turn the current MT5-only Trading Accounts feature into a pluggable multi-platform system (MT5, cTrader, DXtrade, TradeLocker, Alpha Trader) with a global active-account switcher wired into the Command Center and all data views.

## 1. Database migration

Extend `trading_accounts` to match the required schema without breaking existing rows.

New / changed columns:
- `platform` — already exists as text, will be constrained to `mt5 | ctrader | dxtrade | tradelocker | alpha_trader`. Backfill existing 'MT5' rows to 'mt5'.
- `account_number` (text) — canonical login/account ID across platforms.
- `broker` (text, nullable) — required for cTrader / DXtrade / Alpha Trader.
- `credentials` (jsonb) — platform-specific secrets (password, access_token, etc.).
- `status` — already exists. Values normalized to `connected | syncing | disconnected | error`.
- Keep existing `login`, `password`, `server`, `account_name`, `is_default`, timestamps.
- Backfill: copy `login → account_number`, `{password} → credentials` for existing rows.

RLS + GRANTs stay as-is (already scoped to `auth.uid()`). Trigger `enforce_trading_account_limit` remains (Free 1 / Pro 3 / Elite unlimited).

## 2. Platform adapter architecture

New folder `src/lib/platforms/`:

- `types.ts` — `PlatformId`, `PlatformField` (`{ key, label, type: 'text'|'password', placeholder, required }`), `PlatformAdapter` (`{ id, label, icon, credentialFields, accountNumberField, serverField, brokerField, buildRecord(form), summarize(account) }`).
- `mt5.ts`, `ctrader.ts`, `dxtrade.ts`, `tradelocker.ts`, `alpha.ts` — one adapter each, declaring which fields go into `credentials` vs top-level columns.
- `index.ts` — `PLATFORMS: PlatformAdapter[]` registry + `getPlatform(id)` helper.

Adding a new platform later = one new file + one registry entry. No UI code touched.

Field mapping per spec:

| Platform     | account_number | server / broker  | credentials keys |
|--------------|----------------|------------------|------------------|
| MT5          | Login          | server           | password         |
| cTrader      | Account ID     | broker           | access_token     |
| DXtrade      | Username       | broker           | password         |
| TradeLocker  | Account ID     | server           | access_token     |
| Alpha Trader | Username       | broker           | password         |

## 3. Add-Account flow (Settings)

Rewrite `src/components/settings/TradingAccountsSection.tsx`:

1. Click **Add Account** → step 1 shows a grid of platform cards (icon + name).
2. Select platform → step 2 renders a dynamic form driven by the adapter's field list, plus universal fields (Account Name, Set as default).
3. Save writes to `trading_accounts` using the adapter's `buildRecord`.
4. Cards list all platforms with correct field summaries, status pill, default toggle, edit, delete.

## 4. Active-account context

New `src/contexts/ActiveAccountContext.tsx`:

- Loads all `trading_accounts` for the user.
- Tracks `activeAccountId` (persisted to `localStorage`, defaults to the row where `is_default = true`, else the first).
- Exposes `{ accounts, activeAccount, setActiveAccountId, platformFilter, setPlatformFilter, refresh }`.
- Bumps a `version` counter on switch so consumers can re-fetch.

Provider mounted in `src/App.tsx` inside the authenticated `/app` shell.

## 5. Global account switcher (TopBar)

In `src/components/TopBar.tsx`, replace the current `AccountDropdown` (which filters by account *type*) with a two-level switcher:

- **Platform group:** All Accounts · MT5 · cTrader · DXtrade · TradeLocker · Alpha Trader (sets `platformFilter`).
- **Accounts list** for the selected group, each row = account name + platform badge + status dot. Selecting one sets `activeAccountId`.

Old `AccountFilter` type in `GlobalFiltersContext` becomes a no-op alias (kept for existing consumers) — real filtering moves to `ActiveAccountContext`.

## 6. Command Center + data views integration

All data-loading hooks/pages read `activeAccount` and include `.eq('trading_account_id', activeAccount.id)` when set (or ignore filter when `activeAccountId === 'all'`). Files touched (query filter + `useEffect` dep on `activeAccount?.id`):

- `src/pages/Index.tsx` (Command Center dashboard, stats)
- `src/pages/TradeVault.tsx` (trade history / open positions)
- `src/pages/MindJournal.tsx` (journal)
- `src/pages/AIInsights.tsx` (analytics)
- `src/components/AnalyticsMetrics.tsx` (performance metrics)
- `src/contexts/GlobalFiltersContext.tsx` (setups/pairs option lists)

Switching accounts instantly re-runs these queries via the `version` bump.

Note: `trades.trading_account_id` column already exists (used by `enforce_trading_account_limit` context). We'll ensure `AddTradeModal` stamps the current active account on insert.

## 7. Status handling

Status is stored on each row (`connected | syncing | disconnected | error`). No live broker connection is implemented in this pass — status defaults to `disconnected` on create and is settable manually via an adapter-level "Test connection" placeholder that flips to `syncing` then `disconnected` (real integrations come later, one per adapter).

## 8. Plan limits

Unchanged: Free 1, Pro 3, Elite unlimited, enforced by existing DB trigger + client-side guard in the Add flow.

## Technical notes

- Migration is additive; no data loss. Existing single MT5 row for a user becomes their default `mt5` account automatically.
- `credentials` jsonb is only ever selected by the owner (RLS). Never rendered in list view — only shown masked in the edit dialog.
- Adapters are pure config; no runtime imports of platform SDKs yet, so bundle size is unaffected.
- Types regen after migration; then `TradingAccount` interface is re-derived from `Database['public']['Tables']['trading_accounts']['Row']`.

## Out of scope (call out explicitly)

- Real broker API sync / live P&L pull (needs per-broker credentials + edge functions).
- Encryption-at-rest beyond Postgres defaults (credentials stored as jsonb; can be upgraded to Vault later).
