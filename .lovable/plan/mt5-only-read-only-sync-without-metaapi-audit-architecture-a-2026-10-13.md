# MT5-only, read-only sync without MetaApi: audit, architecture and staged plan

This is a plan only. Nothing in the code, database, secrets or production is changed by it.

## 1. What the audit found today (verified)

- **One trading account exists, and it has never reached MetaApi.** The `trading_accounts` table has 1 row and 0 rows with a MetaApi account ID. The last connect attempt failed with "MetaApi 403: top up your account".
- **Investor passwords are stored unencrypted, twice.** The same password is in the `password` column and in `credentials.password`; the one existing row has both.
- **The browser loads that password back.** The Settings screens run `select('*')`, so the password goes back to the browser on every page load. The owner-only access rules mean nobody else can read it, but it is still unencrypted at rest and exposed to the client. This needs fixing whatever provider we choose.
- **Ownership rules on `trading_accounts`:** reading, editing and deleting are limited to the owner (`auth.uid() = user_id`). Inserts are checked by triggers (plan limit, single default account).
- **Trade sync is already safe to repeat.** Trades are upserted on `(trading_account_id, external_id)`, which has a unique index, so re-running a sync does not create duplicates. MetaApi deal IDs are used as `external_id`.
- **Scheduled sync:** `mt-sync` runs on a cron schedule and authenticates with a token stored in `internal_config`.
- **The analytics, journal and dashboard only read `trades` and the account's balance, equity and metrics.** They don't care which provider filled them, so changing provider affects the sync layer only.

## 2. What MT5 can and cannot do (honest constraints)

- **Investor password:** MT5 accepts read-only investor logins. They give access to the balance, equity, open positions and deal history, and trading is rejected by the broker's server. This is the right credential.
- **The official Python `MetaTrader5` package:**
  - It is Windows-only.
  - It drives a locally installed `terminal64.exe` over IPC; it is not a network API.
  - One terminal process holds **one logged-in account at a time**. Calling `login()` switches that terminal to another account.
  - There is no supported headless or Linux mode. Wine can work but is unsupported and fragile, so it is not recommended for production.
- **Broker server discovery:** there is no public API that lists every broker's servers. The options are:
  - a curated list we maintain (the app already has `suggestServers`/`providersFor`), plus free-text entry;
  - or using the terminal's own server search when it opens. That is UI-only and not scriptable in a supported way.
  - In practice: a curated list plus free text, and the first successful login confirms the server.
- **Some brokers block or limit cloud or datacenter IPs**, or need their own branded terminal build. The way to handle this is a test login per broker during setup.
- **Without a Windows machine** it is impossible to log into MT5 with the official API. A Lovable/Supabase edge function cannot run MT5. What we can do without Windows:
  - manual or CSV import, which already exists;
  - a paid cloud provider (MetaApi or similar);
  - an EA or report export, which is excluded by your requirements.

## 3. Proposed self-hosted architecture

```text
Browser ──> Supabase (auth, RLS, trades, accounts)
                 │  sync_jobs queue (service-role only)
                 ▼
   Windows VPS worker pool (outbound HTTPS only)
     worker.py  ── per job ──> terminal64.exe (portable instance N)
         │   decrypt creds (key held only on VPS / KMS)
         │   initialize(login, investor_pw, server) → history_deals_get
         └── writes results via a narrow service endpoint / RPC
```

- **Workers pull jobs; nothing pushes to them.** The VPS opens no inbound ports. It polls a `claim_sync_job` RPC with a scoped worker credential, the same lease pattern as the welcome-email outbox.
- **Terminal pool:** run N portable terminal copies (`/portable`, each in its own folder), each processing one account at a time:
  - log in;
  - read account information, open positions and deals since the last cursor;
  - log out or shut down;
  - move on to the next job.
  - This rotates accounts through the pool instead of keeping a terminal per user.
- **Rough scale:** one sync takes about 10–40 seconds, mostly login time.
  - 4 terminals at a 15-minute interval handle roughly 100–250 accounts.
  - Each terminal uses roughly 150–300 MB of RAM.
  - These are estimates; Stage 1 measures them.
- **Repeat-safe syncing:** keep the `(trading_account_id, external_id)` upsert, using the MT5 deal or position ticket as `external_id`.
  - A per-account `last_deal_time` cursor plus a small overlap window means nothing is missed.
  - Leases and `attempts` give automatic retries; after N failures the account is marked `error` with a safe reason (for example "invalid investor password" or "server unreachable").
- **Tenant isolation:**
  - Jobs carry only an account ID. The worker decrypts credentials in memory, never logs them, and wipes the terminal's saved accounts after each job.
  - Results are written through a function that checks the account and its owner.
  - The browser can never read credentials again.

## 4. Credential encryption and storage (needed for any option)

- **Move passwords into a separate, locked-down table** (for example `trading_account_secrets`). No browser access at all; only the service role can read it.
- **Encrypt them.** Either:
  - encrypt in an edge function with a key held as a backend secret (AES-GCM, versioned), so the VPS gets a decrypt key;
  - or use envelope encryption, with the VPS holding the private key. This one is preferred: the database alone cannot decrypt.
- **Clean up and restrict:**
  - Clear the `password` and `credentials.password` columns once migrated.
  - Stop the Settings screens from loading them with `select('*')`.
  - Mask passwords on screen; changing one re-encrypts it.
- **GDPR:**
  - Credentials and trades are personal data.
  - Deleting an account removes its secrets row and trades (already cascades by account owner).
  - Update the privacy policy to say the investor password is stored encrypted and used read-only, and name the VPS host and region (EU host recommended).
  - Add a retention rule for sync logs.

## 5. Costs (approximate, need confirming at purchase)

| Option | Fixed monthly | Variable | Ops burden |
|---|---|---|---|
| Self-hosted Windows VPS (4–8 GB RAM, Windows Server licence included) | ~USD 20–60 per VPS; second VPS for redundancy doubles it | none per account | High: patching, terminal updates, monitoring, broker quirks |
| Keep MetaApi | Their per-account pricing (needs current quote; account is now blocked pending top-up) | per account/month | Low |
| Other paid MT5 cloud provider | Varies, needs vendor verification | per account | Low–medium |

The VPS costs only beat MetaApi beyond a certain number of connected accounts. Your MetaApi quote decides where that point is. Under roughly 10–20 accounts, MetaApi is usually cheaper once maintenance time is counted.

## 6. Staged implementation

1. **Stage 0 – Security fix, independent of provider (do first):**
   - Add the encrypted secrets table, migrate the one existing row, clear the plaintext columns.
   - Stop loading passwords in the browser.
   - Keep MetaApi code paths working.
2. **Stage 1 – Proof of concept, no user impact:**
   - One Windows VPS with the official MetaTrader5 Python package.
   - Test-log into 3–5 target brokers with investor passwords, and confirm datacenter IPs aren't blocked.
   - Measure login and sync time and RAM use.
3. **Stage 2 – Queue and worker:**
   - Add the `sync_jobs` table and the claim/finish functions (service-only).
   - Build the Python worker with the terminal pool and leases, and write results through an owner-checked function.
4. **Stage 3 – Provider switch:**
   - Add a `sync_provider` field on `trading_accounts` (`metaapi` / `self_hosted`).
   - Restrict the Add Account form to MT5 only (login, investor password, server).
   - `mt-connect` queues a job instead of calling MetaApi; the existing diagnostics steps are mapped to job progress.
5. **Stage 4 – Operations:**
   - Health heartbeat for each worker, and an alert when a job is older than the sync interval.
   - Second VPS for failover.
   - Process for updating terminals.
6. **Stage 5 – Retire MetaApi** (optional), only after all accounts have migrated and synced successfully.

## 7. Exact database impact (all additive)

- **New tables:** `trading_account_secrets` (account_id, owner, ciphertext, key_version) and `sync_jobs` (account_id, status, attempts, lease, cursor, error). Both service-only, with access rules on and no browser access.
- **New columns on `trading_accounts`:** `sync_provider`, `last_deal_cursor`.
- **Removed:** nothing. The plaintext columns are emptied, and are only dropped later in a separate step.
- **Unchanged:** `trades`, the analytics, the journal, billing, auth and the existing unique index.

## 8. Decisions needed from you

1. **Expected number of connected MT5 accounts** at 3 and 12 months. This decides VPS versus MetaApi on cost.
2. **Which brokers or prop firms must work first**, for the Stage 1 test logins.
3. **VPS host and region** (an EU host keeps GDPR simpler). Are you willing to pay roughly USD 20–60 per month per VPS and handle Windows maintenance?
4. **Sync frequency:** every 15 or 60 minutes, or on demand only. This affects how many accounts each VPS can serve.
5. **Approve Stage 0** (encrypting the stored password) now, independently of the provider decision.
6. **Keep MetaApi as a fallback** during the move: top it up, or pause connections until the VPS is ready?
