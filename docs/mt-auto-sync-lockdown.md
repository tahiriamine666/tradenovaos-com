# MT auto sync lockdown

Default: disabled. Only the exact server environment value MT_AUTO_SYNC_ENABLED=true permits broker work. Missing, invalid or unreadable settings fail closed. Never use a VITE_ variable or accept the setting from a request or user metadata.

mt-connect and mt-sync return 503 / MT_AUTO_SYNC_DISABLED before request-body parsing, auth/database client creation, credential retrieval or MetaApi calls. OPTIONS remains available for CORS. Existing authentication and ownership checks run unchanged when explicitly enabled. The shared sync worker and MetaApi transport also guard against alternate callers. Scheduled mt-sync requests are blocked by the same entry guard; the scheduler may still fire HTTP requests, but no account sync runs.

Settings mounts a static Coming Soon panel instead of either connection component. Existing account selectors, trades, manual imports and stored records are unchanged. No schema or data migration is included.

Activation requires founder approval and a project administrator with backend environment-management access. Review and test current authentication/credential handling and provider readiness first; restore the two Settings sections in a reviewed frontend release, then set MT_AUTO_SYNC_ENABLED=true only in the correct live backend. Removing the setting or setting false locks backend execution again. Ordinary app users have no switch or write API. Restrict backend administrator access to founder-approved operators.

Release blocker: GitHub lovable-sync is 7553241 while Lovable was inspected at 588cc8945ac7a8ff1ce95d75ebbf4ac117ea0eab. This draft targets lovable-sync to keep the diff scoped. DO NOT deploy this branch wholesale: restore original Lovable history first, merge this patch into latest source and rerun all checks. The patch applies cleanly to the latest inspected Settings, mt-connect, mt-sync, mtSync and metaapi files, preserving newer credential RPC handling. Latest authentication/calendar files are not touched.

Verification: node scripts/test-mt-lockdown.mjs passes on both GitHub source and patched latest Lovable target files. It executes the actual transpiled handlers with downstream operations forbidden, checks direct/user/cron requests, shared functions and rendered UI. This is mocked local verification, not deployed endpoint verification. Production build is blocked by local esbuild spawn EPERM. Desktop/mobile visual testing and full integration tests remain required before approval. No production changes made.
