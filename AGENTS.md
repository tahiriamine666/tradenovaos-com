Trade `screenshot_url` stays the after-trade image; before-trade image goes in `before_screenshot_url`, so historical charts survive without migration.
Public educational articles use one blog catalog for listing, route registration and Article metadata; the FVG guide retains its dedicated view, so only existing substantive posts are advertised.
One keyed motion boundary for signed-in navigation; shared CSS reveals for repeated trade items.
Outlook checklists live in `trade_plan_checklists` (upserted per user+account_key+type+period_date; pair_checklists add +pair, '' for non-pair; legacy untagged shown under EURUSD until edited), never in the trade plan row.
Plan history edits existing user-owned daily `trade_plans` rows by date; dated outlooks stay separate, legacy embedded outlooks shown read-only when no dated row exists.
BrandLogo is shared except homepage wordmark; homepage styles/variants are opt-in to isolate changes.
NOVA chat streams from the `nova-chat` edge function (JWT/RLS-scoped); conversations/messages/preferences persist in `nova_*` tables.
Economic Calendar: defaults in `economic_calendar_preferences`, presets in `economic_calendar_presets`; temporary filter in sessionStorage, only Save as Default overwrites.
Access decided server-side by `get_access_state` RPC, enforced by RequireAccess on /app; never gate on client flags.
Reviews live in `trading_reviews` (one row per user+account_key+period_type+period_start(+period_end), upserted only on Save with optimistic `revision` checks; created only via explicit "Start review"); stats are pure functions in src/lib/review/stats.ts returning null for unknown data.
Trade psychology ratings 1–10 on the trade row (form shows 1–5, stored = ui×2; psych_discipline_score deprecated); `plan_status` (yes/no/partial) supplements `followed_plan` without rewriting the boolean.
Daily plans: one `trade_plans` row per user+account_key+plan_date+pair; account_key 'all' preserves unassigned plans. Serialized saves retain failed snapshots and flush before scope switches.
Weekly Outlook: one `trade_plan_checklists` row per user+account_key+'weekly_outlook'+week period_date+normalizePair(pair), never pair ''; legacy pair-less rows (account 'all', pair '') are read-through under EURUSD only when no scoped row exists and are never rewritten — prevents one pair's outlook leaking into all pairs.
Admin plan changes only via admin_set_plan/admin_remove_override RPCs; resolution lives in plan_info_for; audited; never touch Dodo billing rows.
Keep UI/chart accents in shared semantic CSS tokens; legacy Tailwind palette aliases resolve to tokens, so views cannot drift apart.
Checklist robot reactions only from explicit unchecked-to-checked clicks, with isolated CSS animation framing.
CookieConsentProvider + one panel above auth routes; versioned browser-only consent; optional trackers via useOptionalConsentEffect with teardown.
Dashboard layout: owner-protected workspace_layouts keyed user_id+page='dashboard', user-keyed caches, explicit saves; widgets rendered by stable IDs.
Daily Plan rules persist per-user in daily_plan_rules: new days pre-fill the saved set unchecked, edits sync it; per-day checked state stays in trade_plans.
Plan editor layout (Daily Plan / Weekly Outlook / Full View) saved once per user in workspace_layouts ('daily_plan'/'weekly_outlook'/'full_view', layout.order), available on every pair/date without creating a plan, with explicit Save/Cancel/Reset; drag & drop must reorder via CSS `order` on stable nodes — moving the dragged DOM node cancels HTML5 drag in Chromium.
Open app view lives in the URL (?view=); AuthContext keeps the same user object across token refreshes.
Monthly offer displays use integer cents and currency formatting from src/lib/pricing.ts; annual quotes and actual checkout charges remain Dodo-authoritative — prevents display drift without altering billing or entitlements.
Legacy admin MRR fields are current-offer estimates, not historical revenue; update their definitions through additive migrations without writing subscriptions — preserves existing customer amounts.
Authenticated Dodo quote responses whitelist public product identifiers and quote fields only; never return provider credentials — supports runtime catalog verification safely.
Review questions: per-user template in review_question_templates ([{id,text,active}]); answers keyed by stable id, removed questions kept inactive and old answers shown read-only — wording/order edits never move or erase answers.
Weekly scorecard scores are pure functions in src/lib/review/scores.ts built on stats.ts outputs; components need ≥3 recorded samples, missing → null ("Not enough data"), overall only when all four exist — missing data is never scored as poor.
Broker investor passwords live only encrypted in `trading_account_secrets` (service-only, no RLS policies); a trigger on `trading_accounts` encrypts any written password and blanks the plaintext columns, and edge functions read it via `get_trading_account_password` — keeps credentials out of the browser and plaintext storage.
