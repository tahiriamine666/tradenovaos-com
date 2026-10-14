# Dependency security review — PR #9

## Final recheck, 14 October 2026

The refreshed full audit still reports **0 critical, 5 high, 11 moderate**. Current installed high-chain versions and registry checks are braces **3.0.3**, micromatch **4.0.8**, fast-glob **3.3.3**, chokidar **3.6.0** (latest compatible 3.x), and Tailwind **3.4.19**. Exact paths are:

- tailwindcss → chokidar → braces
- tailwindcss → micromatch → braces
- tailwindcss → fast-glob → micromatch → braces
- lovable-tagger → tailwindcss, plus Tailwind peer consumers @tailwindcss/typography and tailwindcss-animate.

The [upstream braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) explicitly lists **no patched version**. The five high entries are propagation of this one recursive stack-exhaustion advisory, not five independently patched bugs. npm's proposed lovable-tagger downgrade does not eliminate the app's direct Tailwind chain. Forcing Chokidar 4 or Tailwind 4 would change APIs/build behavior and is not a compatible patch.

The remaining eleven moderate package entries are @esbuild-kit/core-utils, @esbuild-kit/esm-loader, drizzle-kit, esbuild, @tailwindcss/typography, lovable-tagger, postcss-nested, postcss-selector-parser, tailwindcss-animate, react-router and react-router-dom. Installed versions, affected ranges and paths are recorded in the baseline sections below; Vite's old esbuild node has since been removed, leaving only core-utils → esbuild 0.18.20 affected. Selector parser's latest 6.x remains 6.1.4; the patch is 7.1.6+. React Router's latest 6.x remains 6.30.6; the patch is 7.18.0+. No incompatible override, router migration or Drizzle downgrade was made. The isolated backend-test dependency audit is clean.

### Reviewable exception proposal — not applied

If a security owner accepts temporary build-time risk, consider an exception **only** for GHSA-vfj7-8cjw-p6xm at the exact above versions/paths, expiring **28 October 2026**, with a weekly upstream recheck, trusted checked-in glob patterns, no uploaded/untrusted build inputs, no public development server, and least-privilege isolated CI. Reject the exception if these assumptions change. This is justified only by the absence of a patched release and lack of a runtime path in the static application; developer/CI denial-of-service risk remains.

Do not exempt all high/moderate findings or change audit thresholds. The moderate chains require their own documented review or compatible upstream fixes. No exception has been accepted, no check has been bypassed, and the PR remains **NOT READY TO MERGE** under its current gates.

## Original audit and remediation record

Baseline: 4c3df6b9b8b8e1deaaecc6a5cb2aa99c8b30bbbb. Reviewed 2026-10-14. npm reports 21 affected package entries, not 21 independent CVEs; parent packages inherit findings.

## Scope and production exposure

The application uses createRoot and BrowserRouter (src/main.tsx, src/App.tsx), not server-side React hydration. Vite generates static dist assets. Dev/test/CSS tools are not imported by application or Edge Function runtime code. Production exploitability below is a source-based assessment of that deployment model, not an attestation of the live host configuration. `npm audit --omit=dev` still includes Tailwind peer dependencies through production-listed tailwindcss-animate; that does not mean the CSS compiler executes in the browser. No untrusted user patterns, CSS selectors or source maps are fed into build tools by the inspected source.

React Router is browser runtime code. Link/navigation targets inspected are literals, checked-in navigation catalogs and checked-in article Markdown. No attacker-controlled redirect destination was identified. The redirect advisory remains a latent risk if untrusted destinations are introduced. SSR deserializeErrors is not used. Neither finding is declared universally unexploitable.

## All baseline findings

### @esbuild-kit/core-utils — moderate

- Installed affected nodes: `node_modules/@esbuild-kit/core-utils@3.3.2`.
- Advisory affected range: `*`.
- Resolved dependency paths (one shortest path per direct root):
  - drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils
- Cause: inherited from esbuild.
- Production exposure: Development/build/database tooling only; no corresponding server in the static production deployment. Development server exposure can permit file reads. Vite configuration listens on all interfaces, making its patch important for local Windows development.
- Result: Remains moderate.

### @esbuild-kit/esm-loader — moderate

- Installed affected nodes: `node_modules/@esbuild-kit/esm-loader@2.6.5`.
- Advisory affected range: `*`.
- Resolved dependency paths (one shortest path per direct root):
  - drizzle-kit → @esbuild-kit/esm-loader
- Cause: inherited from @esbuild-kit/core-utils.
- Production exposure: Development/build/database tooling only; no corresponding server in the static production deployment. Development server exposure can permit file reads. Vite configuration listens on all interfaces, making its patch important for local Windows development.
- Result: Remains moderate.

### @tailwindcss/typography — moderate

- Installed affected nodes: `node_modules/@tailwindcss/typography@0.5.20`.
- Advisory affected range: `<=0.4.0 || >=0.5.0-alpha.1`.
- Resolved dependency paths (one shortest path per direct root):
  - @tailwindcss/typography
- Cause: inherited from postcss-selector-parser; inherited from tailwindcss.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains moderate.

### @vitest/mocker — moderate

- Installed affected nodes: `node_modules/@vitest/mocker@3.2.7`.
- Advisory affected range: `2.1.0 - 4.1.10`.
- Resolved dependency paths (one shortest path per direct root):
  - vitest → @vitest/mocker
- Cause: [Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) — affected `>=2.1.0 <4.1.11`.
- Production exposure: Test runner only; not deployed in static assets. Tinypool RCE requires prototype pollution/attacker-controlled worker options; mocker file reads require the relevant test server. Developer/CI exposure matters.
- Result: No longer reported in refreshed audit.

### braces — high

- Installed affected nodes: `node_modules/braces@3.0.3`.
- Advisory affected range: `*`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss → chokidar → braces
  - @tailwindcss/typography → tailwindcss → chokidar → braces
  - lovable-tagger → tailwindcss → chokidar → braces
  - tailwindcss → chokidar → braces
- Cause: [braces vulnerable to stack-exhaustion denial of service through deeply nested patterns](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — affected `<=3.0.3`.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains high.

### chokidar — high

- Installed affected nodes: `node_modules/chokidar@3.6.0`.
- Advisory affected range: `2.0.0 - 3.6.0`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss → chokidar
  - @tailwindcss/typography → tailwindcss → chokidar
  - lovable-tagger → tailwindcss → chokidar
  - tailwindcss → chokidar
- Cause: inherited from braces.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains high.

### drizzle-kit — moderate

- Installed affected nodes: `node_modules/drizzle-kit@0.31.11`.
- Advisory affected range: `0.19.0 - 1.0.0-beta.1-fd8bfcc`.
- Resolved dependency paths (one shortest path per direct root):
  - drizzle-kit
- Cause: inherited from @esbuild-kit/esm-loader.
- Production exposure: Development/build/database tooling only; no corresponding server in the static production deployment. Development server exposure can permit file reads. Vite configuration listens on all interfaces, making its patch important for local Windows development.
- Result: Remains moderate.

### esbuild — moderate

- Installed affected nodes: `node_modules/@esbuild-kit/core-utils/node_modules/esbuild@0.18.20`, `node_modules/esbuild@0.21.5`.
- Advisory affected range: `<=0.24.2`.
- Resolved dependency paths (one shortest path per direct root):
  - drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild
  - @vitejs/plugin-react-swc → vite → esbuild
  - lovable-tagger → vite → esbuild
  - vite → esbuild
  - vitest → vite → esbuild
- Cause: [esbuild enables any website to send any requests to the development server and read the response](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — affected `<=0.24.2`.
- Production exposure: Development/build/database tooling only; no corresponding server in the static production deployment. Development server exposure can permit file reads. Vite configuration listens on all interfaces, making its patch important for local Windows development.
- Result: Remains moderate.

### fast-glob — high

- Installed affected nodes: `node_modules/fast-glob@3.3.3`.
- Advisory affected range: `*`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss → fast-glob
  - @tailwindcss/typography → tailwindcss → fast-glob
  - lovable-tagger → tailwindcss → fast-glob
  - tailwindcss → fast-glob
- Cause: inherited from micromatch.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains high.

### lovable-tagger — moderate

- Installed affected nodes: `node_modules/lovable-tagger@1.3.5`.
- Advisory affected range: `>=1.1.1`.
- Resolved dependency paths (one shortest path per direct root):
  - lovable-tagger
- Cause: inherited from tailwindcss.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains moderate.

### micromatch — high

- Installed affected nodes: `node_modules/micromatch@4.0.8`.
- Advisory affected range: `>=0.2.0`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss → micromatch
  - @tailwindcss/typography → tailwindcss → micromatch
  - lovable-tagger → tailwindcss → micromatch
  - tailwindcss → micromatch
- Cause: inherited from braces.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains high.

### postcss-nested — moderate

- Installed affected nodes: `node_modules/postcss-nested@6.2.0`.
- Advisory affected range: `2.0.3 - 6.2.0`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss → postcss-nested
  - @tailwindcss/typography → tailwindcss → postcss-nested
  - lovable-tagger → tailwindcss → postcss-nested
  - tailwindcss → postcss-nested
- Cause: inherited from postcss-selector-parser.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains moderate.

### postcss-selector-parser — moderate

- Installed affected nodes: `node_modules/@tailwindcss/typography/node_modules/postcss-selector-parser@6.0.10`, `node_modules/postcss-selector-parser@6.1.4`.
- Advisory affected range: `<7.1.6`.
- Resolved dependency paths (one shortest path per direct root):
  - @tailwindcss/typography → postcss-selector-parser
  - tailwindcss-animate → tailwindcss → postcss-selector-parser
  - @tailwindcss/typography → tailwindcss → postcss-selector-parser
  - lovable-tagger → tailwindcss → postcss-selector-parser
  - tailwindcss → postcss-selector-parser
- Cause: [PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) — affected `<7.1.6`.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains moderate.

### react-router — moderate

- Installed affected nodes: `node_modules/react-router@6.30.6`.
- Advisory affected range: `6.0.0 - 7.17.0`.
- Resolved dependency paths (one shortest path per direct root):
  - react-router-dom → react-router
- Cause: [React Router: Open redirect via backslash in <Link> and useNavigate (CVE-2025-68470 bypass)](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) — affected `>=6.0.0 <7.18.0`; [React Router: Arbitrary Constructor Injection via deserializeErrors() in React Router SSR Hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg) — affected `>=6.4.0 <7.18.0`.
- Production exposure: Browser runtime; no attacker-controlled destination found; SSR hydration path absent. Remaining moderate risk as described above.
- Result: Remains moderate.

### react-router-dom — moderate

- Installed affected nodes: `node_modules/react-router-dom@6.30.6`.
- Advisory affected range: `6.0.0-alpha.0 - 7.17.0`.
- Resolved dependency paths (one shortest path per direct root):
  - react-router-dom
- Cause: inherited from react-router.
- Production exposure: Browser runtime; no attacker-controlled destination found; SSR hydration path absent. Remaining moderate risk as described above.
- Result: Remains moderate.

### source-map-js — high

- Installed affected nodes: `node_modules/source-map-js@1.2.1`.
- Advisory affected range: `1.0.0 - 1.2.1`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss → postcss → source-map-js
  - @tailwindcss/typography → tailwindcss → postcss → source-map-js
  - @vitejs/plugin-react-swc → vite → postcss → source-map-js
  - autoprefixer → postcss → source-map-js
  - lovable-tagger → tailwindcss → postcss → source-map-js
  - postcss → source-map-js
  - tailwindcss → postcss → source-map-js
  - vite → postcss → source-map-js
  - vitest → vite → postcss → source-map-js
- Cause: [source-map-js allows event-loop denial of service through indexed source-map section offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) — affected `>=1.0.0 <1.2.2`.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: No longer reported in refreshed audit.

### tailwindcss — high

- Installed affected nodes: `node_modules/tailwindcss@3.4.19`.
- Advisory affected range: `<=0.0.0-oxide-insiders.ff2c25f || 0.5.0 - 3.4.19`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate → tailwindcss
  - @tailwindcss/typography → tailwindcss
  - lovable-tagger → tailwindcss
  - tailwindcss
- Cause: inherited from chokidar; inherited from fast-glob; inherited from micromatch; inherited from postcss-nested; inherited from postcss-selector-parser.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains high.

### tailwindcss-animate — moderate

- Installed affected nodes: `node_modules/tailwindcss-animate@1.0.7`.
- Advisory affected range: `*`.
- Resolved dependency paths (one shortest path per direct root):
  - tailwindcss-animate
- Cause: inherited from tailwindcss.
- Production exposure: CSS/build tooling only; no identified runtime execution or attacker-controlled pattern/selector/source-map input. Malicious build inputs can still cause denial of service.
- Result: Remains moderate.

### tinypool — critical

- Installed affected nodes: `node_modules/tinypool@1.1.1`.
- Advisory affected range: `<=2.1.1`.
- Resolved dependency paths (one shortest path per direct root):
  - vitest → tinypool
- Cause: [Tinypool: Prototype Pollution gadget in worker options leads to Remote Code Execution](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) — affected `<=2.1.0`; [Tinypool: Prototype Pollution Gadget to RCE in run() options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) — affected `<2.1.2`.
- Production exposure: Test runner only; not deployed in static assets. Tinypool RCE requires prototype pollution/attacker-controlled worker options; mocker file reads require the relevant test server. Developer/CI exposure matters.
- Result: No longer reported in refreshed audit.

### vite — high

- Installed affected nodes: `node_modules/vite@5.4.21`.
- Advisory affected range: `<=6.4.2`.
- Resolved dependency paths (one shortest path per direct root):
  - @vitejs/plugin-react-swc → vite
  - lovable-tagger → vite
  - vite
  - vitest → vite
- Cause: [Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — affected `<=6.4.1`; [launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) — affected `<=6.4.2`; [vite: `server.fs.deny` bypass on Windows alternate paths](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — affected `<=6.4.2`; inherited from esbuild.
- Production exposure: Development/build/database tooling only; no corresponding server in the static production deployment. Development server exposure can permit file reads. Vite configuration listens on all interfaces, making its patch important for local Windows development.
- Result: No longer reported in refreshed audit.

### vitest — critical

- Installed affected nodes: `node_modules/vitest@3.2.7`.
- Advisory affected range: `0.0.95 - 4.1.10`.
- Resolved dependency paths (one shortest path per direct root):
  - vitest
- Cause: inherited from @vitest/mocker; [Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) — affected `>=2.1.0 <4.1.11`; inherited from tinypool.
- Production exposure: Test runner only; not deployed in static assets. Tinypool RCE requires prototype pollution/attacker-controlled worker options; mocker file reads require the relevant test server. Developer/CI exposure matters.
- Result: No longer reported in refreshed audit.

## Changes and residual decisions

- Vite 5.4.21 → 6.4.4: smallest patched supported major line for the Windows path-deny advisory (6.4.3+); existing React SWC plugin supports Vite 6. No Vite 8 migration.
- Vitest 3.2.7 → 4.1.11: removes Tinypool and patches mocker; avoids latest Vitest 5. Vitest 3 still depends on vulnerable Tinypool 1.x. Node 20+ required; CI uses Node 22.
- source-map-js updated within its existing 1.x dependency range to 1.2.2.
- No overrides, force audit fix, runtime router migration, schema changes or application logic edits.
- Remaining five high package entries (braces, chokidar, micromatch, fast-glob, tailwindcss) share the unpatched braces advisory. Official advisory lists no patched version; registry latest braces remains 3.0.3. Do not substitute an incompatible watcher/glob implementation or migrate Tailwind solely to silence the report.
- Remaining moderate chains: Drizzle/esbuild, PostCSS selector parser/Tailwind plugins, and React Router. Removing them needs additional tooling or runtime migration review.
- Before: 2 critical / 7 high / 12 moderate. After: 0 critical / 5 high / 11 moderate. Keep security gate failing while unresolved findings remain.

## Validation

Verified dependency/test code at 97505c06b60b0b0551586084b9d3b6bfb0fafc17 in [Linux CI run 38519348181](https://github.com/tahiriamine666/tradenovaos-com/actions/runs/38519348181): clean npm ci PASS; TypeScript PASS; 109 frontend tests across 17 files PASS; 28 isolated backend tests PASS; Vite production build PASS (17.82 seconds). Refreshed audit FAIL: 0 critical, 5 high, 11 moderate. Backend test dependency audit: 0 findings. Production-only npm classification: 5 high, 5 moderate (includes build-time Tailwind peer chain as explained above).

Three existing test files now explicitly reference Node/ES2022 array types that Vitest 3 previously supplied transitively; assertions and production behavior are unchanged. No tests were skipped or weakened. No deployment or production probing.
