
-- =========================================================
-- Community Space — Phase 1
-- =========================================================

-- Helper: returns 'free' | 'pro' | 'elite' for the current user
CREATE OR REPLACE FUNCTION public.community_user_tier()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.plan_type = 'elite' AND p.subscription_status IN ('active','trialing') THEN 'elite'
    WHEN p.plan_type = 'pro'   AND p.subscription_status IN ('active','trialing') THEN 'pro'
    ELSE 'free'
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
$$;

-- =========================================================
-- community_profiles
-- =========================================================
CREATE TABLE public.community_profiles (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username          text UNIQUE NOT NULL,
  bio               text,
  avatar_url        text,
  experience_level  text NOT NULL DEFAULT 'beginner'
                    CHECK (experience_level IN ('beginner','intermediate','advanced','elite')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_profiles_username_idx ON public.community_profiles (lower(username));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_profiles TO authenticated;
GRANT ALL ON public.community_profiles TO service_role;
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_profiles_select_all_auth"
  ON public.community_profiles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "community_profiles_insert_self"
  ON public.community_profiles FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_profiles_update_self"
  ON public.community_profiles FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_profiles_delete_self"
  ON public.community_profiles FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_community_profiles_updated_at
  BEFORE UPDATE ON public.community_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- community_posts
-- =========================================================
CREATE TABLE public.community_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'discussion'
                  CHECK (type IN ('discussion','trade_idea','lesson','question','replay_review','journal_insight')),
  category        text NOT NULL DEFAULT 'feed'
                  CHECK (category IN ('feed','trade-ideas','setups','psychology','risk','ict','smc','funded')),
  title           text NOT NULL,
  content         text NOT NULL DEFAULT '',
  tags            text[] NOT NULL DEFAULT '{}',
  image_urls      text[] NOT NULL DEFAULT '{}',
  visibility      text NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public','pro','elite')),
  trade_idea      jsonb,
  like_count      int  NOT NULL DEFAULT 0,
  comment_count   int  NOT NULL DEFAULT 0,
  bookmark_count  int  NOT NULL DEFAULT 0,
  is_pinned       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_posts_created_idx  ON public.community_posts (created_at DESC);
CREATE INDEX community_posts_category_idx ON public.community_posts (category, created_at DESC);
CREATE INDEX community_posts_user_idx     ON public.community_posts (user_id, created_at DESC);
CREATE INDEX community_posts_type_idx     ON public.community_posts (type, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_posts_select_visible"
  ON public.community_posts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'pro'   AND public.community_user_tier() IN ('pro','elite'))
    OR (visibility = 'elite' AND public.community_user_tier() = 'elite')
  );
CREATE POLICY "community_posts_insert_self"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_posts_update_self"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_posts_delete_self"
  ON public.community_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- community_comments
-- =========================================================
CREATE TABLE public.community_comments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id   uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  content             text NOT NULL,
  like_count          int  NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_comments_post_idx   ON public.community_comments (post_id, created_at);
CREATE INDEX community_comments_parent_idx ON public.community_comments (parent_comment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_comments_select_if_post_visible"
  ON public.community_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id));
CREATE POLICY "community_comments_insert_self"
  ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_comments_update_self"
  ON public.community_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_comments_delete_self"
  ON public.community_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comment count trigger
CREATE OR REPLACE FUNCTION public.community_comment_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_community_comments_count
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comment_count_trigger();

-- =========================================================
-- community_likes
-- =========================================================
CREATE TABLE public.community_likes (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type  text NOT NULL CHECK (target_type IN ('post','comment')),
  target_id    uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
CREATE INDEX community_likes_target_idx ON public.community_likes (target_type, target_id);

GRANT SELECT, INSERT, DELETE ON public.community_likes TO authenticated;
GRANT ALL ON public.community_likes TO service_role;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_likes_select_all"
  ON public.community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "community_likes_insert_self"
  ON public.community_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_likes_delete_self"
  ON public.community_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.community_like_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE public.community_comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE public.community_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_community_likes_count
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.community_like_count_trigger();

-- =========================================================
-- community_bookmarks
-- =========================================================
CREATE TABLE public.community_bookmarks (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX community_bookmarks_post_idx ON public.community_bookmarks (post_id);

GRANT SELECT, INSERT, DELETE ON public.community_bookmarks TO authenticated;
GRANT ALL ON public.community_bookmarks TO service_role;
ALTER TABLE public.community_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_bookmarks_select_self"
  ON public.community_bookmarks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "community_bookmarks_insert_self"
  ON public.community_bookmarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "community_bookmarks_delete_self"
  ON public.community_bookmarks FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.community_bookmark_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_community_bookmarks_count
  AFTER INSERT OR DELETE ON public.community_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.community_bookmark_count_trigger();

-- =========================================================
-- community_follows
-- =========================================================
CREATE TABLE public.community_follows (
  follower_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX community_follows_following_idx ON public.community_follows (following_id);

GRANT SELECT, INSERT, DELETE ON public.community_follows TO authenticated;
GRANT ALL ON public.community_follows TO service_role;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_follows_select_all"
  ON public.community_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "community_follows_insert_self"
  ON public.community_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "community_follows_delete_self"
  ON public.community_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- =========================================================
-- community_reports
-- =========================================================
CREATE TABLE public.community_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type  text NOT NULL CHECK (target_type IN ('post','comment','user')),
  target_id    uuid NOT NULL,
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_reports_select_self_or_admin"
  ON public.community_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "community_reports_insert_self"
  ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- =========================================================
-- Realtime
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_likes;
