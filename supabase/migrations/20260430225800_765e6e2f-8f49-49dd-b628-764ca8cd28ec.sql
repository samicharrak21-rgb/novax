-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.post_type AS ENUM ('post', 'repost', 'quote');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Roles viewable by self or admin" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AUTO-PROFILE on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_username TEXT; final_username TEXT; n INT := 0;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'user');
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]+', '_', 'g');
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    n := n + 1; final_username := base_username || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'display_name', final_username));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FOLLOWERS
CREATE TABLE public.followers (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows readable by all" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users follow as themselves" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow as themselves" ON public.followers FOR DELETE USING (auth.uid() = follower_id);
CREATE INDEX idx_followers_following ON public.followers(following_id);

-- POSTS
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT,
  image_url TEXT,
  video_url TEXT,
  is_reel BOOLEAN NOT NULL DEFAULT false,
  post_type public.post_type NOT NULL DEFAULT 'post',
  parent_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  hashtags TEXT[],
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_parent ON public.posts(parent_post_id);
CREATE INDEX idx_posts_is_reel ON public.posts(is_reel);
CREATE INDEX idx_posts_hashtags ON public.posts USING GIN(hashtags);
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LIKES
CREATE TABLE public.likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users like as self" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike as self" ON public.likes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_likes_post ON public.likes(post_id);

-- COMMENTS
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users comment as self" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_comments_post ON public.comments(post_id);

-- SAVED POSTS
CREATE TABLE public.saved_posts (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saved viewable by self" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Save as self" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Unsave as self" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- POST VIEWS
CREATE TABLE public.post_views (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post views inserted by authenticated" ON public.post_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Post views readable by all" ON public.post_views FOR SELECT USING (true);
CREATE INDEX idx_post_views_post ON public.post_views(post_id);

CREATE OR REPLACE FUNCTION public.bump_post_views()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.posts SET views_count = views_count + 1 WHERE id = NEW.post_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_bump_post_views AFTER INSERT ON public.post_views FOR EACH ROW EXECUTE FUNCTION public.bump_post_views();

-- STORIES
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories viewable by all" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Create story as self" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own story" ON public.stories FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_stories_user ON public.stories(user_id);
CREATE INDEX idx_stories_expires ON public.stories(expires_at);

-- STORY INTERACTIONS
CREATE TABLE public.story_views (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story views readable by owner & viewer" ON public.story_views FOR SELECT
  USING (auth.uid() = viewer_id OR auth.uid() = (SELECT user_id FROM public.stories WHERE id = story_id));
CREATE POLICY "Insert story view as self" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE TABLE public.story_likes (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story likes readable by all" ON public.story_likes FOR SELECT USING (true);
CREATE POLICY "Story like as self" ON public.story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Story unlike as self" ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.story_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.story_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story msgs read by sender or owner" ON public.story_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = (SELECT user_id FROM public.stories WHERE id = story_id));
CREATE POLICY "Send story msg as self" ON public.story_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = _conv AND user_id = _user);
$$;

CREATE POLICY "Conv readable by participants" ON public.conversations FOR SELECT
  USING (public.is_conversation_participant(id, auth.uid()));
CREATE POLICY "Authenticated create conv" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Participants update conv" ON public.conversations FOR UPDATE
  USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Participants readable to participants" ON public.conversation_participants FOR SELECT
  USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Add participants flexible" ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_conversation_participant(conversation_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Remove self from conv" ON public.conversation_participants FOR DELETE
  USING (auth.uid() = user_id);

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages readable by participants" ON public.messages FOR SELECT
  USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Send messages as participant" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND public.is_conversation_participant(conversation_id, auth.uid()));
CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END; $$;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifs readable by owner" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated create notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner updates own notifs" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX idx_notifs_user ON public.notifications(user_id, created_at DESC);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Media public read" ON storage.objects FOR SELECT USING (bucket_id IN ('media','avatars'));
CREATE POLICY "Authenticated upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);