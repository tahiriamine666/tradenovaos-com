# Public information pages — 17 October 2026

Implemented against a fresh export of Lovable project 0ee4a120-abbf-401b-9623-1114b47e7fda, not by rebuilding from GitHub main.

## Source reconciliation
The latest export already removes Solutions from the single navigation configuration used by desktop/mobile; underlying pages are retained. Existing psychologyAudit.ts and its tests are preserved. The new twelve-question assessment uses publicPsychologyAudit.ts independently. Current founder component, portrait descriptor and official N logo are preserved. Public-only logo component avoids changing internal app branding. Google OAuth, authentication, billing, trading code, database schemas and edge functions are unchanged.

## GitHub delivery
This PR contains actual application code, not only a patch. Parent is GitHub lovable-sync d4673d60a6d4d385823aa06270d43c47634a765e, preserving its ancestry. Latest Lovable's export has no Git history and Git settings currently show no connected repository. No claim is made that this synchronizes all newer Lovable work. The current public navigation/footer source and required founder/logo assets are included; unrelated newer files are not copied. Reconcile latest Lovable original commits before merging. Do not force-push or replace the project with an old branch.

## Pages
/faq, /psychology-audit, /how-nova-works, /about, /security.
Public App routes, navigation descriptions, footer links, unique SeoHead metadata/canonicals and sitemap entries are included. Anonymous assessment uses component state only, no storage or network calls. FAQ accordions and score/reset behavior have regression tests. SEO remains client-rendered; hosting must retain its existing SPA fallback for direct requests.

## Verified content
Current googleAuth.ts uses lovable.auth.signInWithOAuth. nova-chat selects bounded data using eq(user_id, uid) and an AI gateway; the security page explicitly distinguishes source policies from a production security audit. Existing Supabase policy definitions restrict profiles/trades/journal ownership. No certifications, guaranteed trading outcomes or founder biography are invented.

## Known limitations
Windows dependency installation was previously blocked; validation uses the available cached Vite6/Vitest4 dependency set, not a clean lockfile install. Standard TypeScript has five pre-existing test configuration errors (Array.at library and node:fs types). Supplemental ES2022/node/vitest typecheck passes. Browser cannot reach the running localhost preview (ERR_CONNECTION_TIMED_OUT), so no desktop/mobile visual pass is claimed. Founder portrait retains its original Lovable-hosted asset URL; verify resolution on any non-Lovable deployment.
Final test/build results are in the PR description.

No merge, deployment, publication, production writes or Lovable AI credits.
