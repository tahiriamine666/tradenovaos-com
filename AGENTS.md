Keep the existing trade `screenshot_url` as the after-trade image and store the before-trade image in `before_screenshot_url`, so historical charts remain visible without migration.
Use one keyed motion boundary for signed-in feature navigation, with shared CSS reveals for repeated trade items, so transitions remain consistent without animating every screen independently.
Weekly/Daily Outlook checklists live in `trade_plan_checklists` (one row per user+account_key+type+period_date, upserted), never in the trade plan row — keeps history per date/week/account.
Trade Plan history reads and edits the existing user-owned daily `trade_plans` rows by date; leave dated outlooks separate and show legacy embedded outlooks read-only when no dated row exists, so historical records remain intact.
Use the shared BrandLogo component for in-app brand placements and derive the favicon from the same uploaded image, so brand changes remain consistent across screens.
