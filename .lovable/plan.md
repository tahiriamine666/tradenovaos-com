
# Community Space — Phase 1: Feed + Profiles + Follow

Build a production-ready foundation. Chat, Challenges, Leaderboard, Badges, AI insights, and Moderation ship in later phases.

## 1. Database (one migration)

New tables, all RLS-protected with GRANTs to `authenticated` + `service_role`:

- **community_profiles** — `user_id` (PK, FK profiles), `username` (unique), `bio`, `avatar_url`, `experience_level` (beginner/intermediate/advanced/elite), auto-derived from existing `profiles` + `learning_stats` for XP/level. Auto-created on first community visit via upsert.
- **community_posts** — `user_id`, `type` (discussion / trade_idea / lesson / question / replay_review / journal_insight), `category` (feed / trade-ideas / setups / psychology / risk / ict / smc / funded), `title`, `content`, `tags text[]`, `image_urls text[]`, `visibility` (public / pro / elite), `trade_idea jsonb` (pair, direction, entry, sl, tp, risk_pct, setup, expected_rr), `like_count`, `comment_count`, `bookmark_count` (denormalized, kept in sync by triggers), `is_pinned`, `created_at`.
- **community_comments** — `post_id`, `user_id`, `parent_comment_id` (nullable, for threads), `content`, `like_count`, `created_at`.
- **community_likes** — `(user_id, target_type, target_id)` PK; `target_type` enum post/comment. Trigger updates parent count.
- **community_bookmarks** — `(user_id, post_id)` PK. Trigger updates count.
- **community_follows** — `(follower_id, following_id)` PK; trigger NOOP (counts derived live, cheap with index).
- **community_reports** — `reporter_id`, `target_type`, `target_id`, `reason`, `status`.

**Storage**: new public bucket `community-uploads` for post images (created via `supabase--storage_create_bucket`, RLS on `storage.objects` so only authenticated users upload to their own `user_id/` prefix; everyone can read).

**Visibility gating in RLS**: SELECT policy on `community_posts` checks `visibility = 'public' OR (visibility='pro' AND get_user_plan_info()->>'plan' IN ('pro','elite')) OR (visibility='elite' AND plan='elite') OR user_id = auth.uid()`. Uses a new `SECURITY DEFINER` helper `public.user_plan_tier()` to avoid recursion.

**Realtime**: enable on `community_posts`, `community_comments`, `community_likes` so feed updates live.

## 2. Frontend

### Sidebar entry
Add `Community` item to `src/components/AppLayout.tsx` `BASE_ITEMS` (Users icon), wire into `src/pages/Index.tsx` (`active === 'community' && <CommunitySpace />`).

### Page shell — `src/pages/CommunitySpace.tsx`
Three-pane layout: `| Left categories | Feed | Right rail |`. Left rail: Feed, Trade Ideas, Setups, Psychology, Risk, ICT, SMC, Funded, My Posts, Bookmarks (essentials). Right rail: Suggested traders to follow, your XP/level card, top tags.

Glass cards, purple primary, green for wins, red for losses. Light + dark mode via existing tokens. Framer-motion list animations, infinite scroll via IntersectionObserver paginating `community_posts` by `created_at`.

### Components — `src/components/community/`
- `CommunityLeftRail.tsx` — categories with counts
- `CommunityRightRail.tsx` — suggested follows + profile mini-card
- `PostComposer.tsx` — title, content (textarea), category pills, tag chips, post-type selector (Discussion / Trade Idea / Lesson / Question / Replay Review / Journal Insight), visibility selector (Public / Pro / Elite — Pro/Elite options hidden for free users), drag-drop image upload to `community-uploads`, conditional Trade Idea form (pair, direction, entry/SL/TP, risk %, setup, expected RR).
- `PostCard.tsx` — avatar, username + experience level badge + XP, time, category badge, content (markdown), image grid, like/comment/bookmark/share/report actions. Optimistic like + bookmark.
- `TradeIdeaCard.tsx` — rendered when `post.type === 'trade_idea'`: pair header, direction pill (green long / red short), entry/SL/TP/RR grid, risk %, setup tag.
- `PostDetailDrawer.tsx` — slide-over with full post + threaded comments.
- `CommentThread.tsx` — recursive replies (max depth 3), mention parsing (`@username` → link to profile), like, report.
- `ProfileDrawer.tsx` — opened by clicking any avatar/username. Shows avatar, username, bio, XP, level, win rate (derived from `trades`), total trades, playbook count, followers/following counts, Follow/Unfollow button, recent posts list, badges placeholder.
- `FollowButton.tsx` — optimistic toggle on `community_follows`.

### Hooks
- `useCommunityProfile(userId?)` — fetch/upsert own profile, ensure record exists.
- `useFeed({ category, type? })` — paginated query + Realtime subscription appending new rows.
- `useFollow(targetId)` — follow state + toggle.

## 3. Visibility enforcement (UI)
- Composer hides Pro/Elite options for free users.
- Free users automatically don't see Pro/Elite posts because of RLS; no client-side filter needed.

## 4. Out of scope (later phases)
Chat channels, Challenges, Leaderboard, Badges engine, AI insights, full moderation panel, mentions notifications, share-out, infinite categories beyond essentials. Schema leaves room; UI shows "Coming soon" placeholders on sidebar items that aren't built.

## Files

**Migration**: 1 file creating all 7 tables + helper function + storage bucket policies + Realtime publication.

**New components** (`src/components/community/`): `CommunityLeftRail`, `CommunityRightRail`, `PostComposer`, `PostCard`, `TradeIdeaCard`, `PostDetailDrawer`, `CommentThread`, `ProfileDrawer`, `FollowButton`.

**New page**: `src/pages/CommunitySpace.tsx`.

**New hooks**: `src/hooks/useCommunityProfile.ts`, `useFeed.ts`, `useFollow.ts`.

**Edited**: `src/components/AppLayout.tsx` (sidebar item), `src/pages/Index.tsx` (route wiring).

**Storage**: create `community-uploads` bucket via tool.

No mock data — every list reads from Supabase.
