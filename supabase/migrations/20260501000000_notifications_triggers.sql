-- ===========================================================
-- Fix notifications + story replies + DM realtime
-- Adds auto-insert triggers for notifications and exposes
-- additional realtime tables.
-- ===========================================================

-- 1) Make sure the notifications table can carry the metadata we need.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS comment_text TEXT,
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- ===========================================================
-- Helper: insert notification (skips self-notifications)
-- ===========================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _actor_id UUID,
  _type TEXT,
  _post_id UUID DEFAULT NULL,
  _story_id UUID DEFAULT NULL,
  _conversation_id UUID DEFAULT NULL,
  _comment_text TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _actor_id IS NULL THEN RETURN; END IF;
  IF _user_id = _actor_id THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, story_id, conversation_id, comment_text)
  VALUES (_user_id, _actor_id, _type, _post_id, _story_id, _conversation_id, _comment_text);
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ===========================================================
-- LIKE notifications
-- ===========================================================
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.posts WHERE id = NEW.post_id;
  PERFORM public.create_notification(owner, NEW.user_id, 'like', NEW.post_id, NULL, NULL, NULL);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- ===========================================================
-- COMMENT notifications
-- ===========================================================
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.posts WHERE id = NEW.post_id;
  PERFORM public.create_notification(owner, NEW.user_id, 'comment', NEW.post_id, NULL, NULL, LEFT(NEW.content, 140));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- ===========================================================
-- FOLLOW notifications
-- ===========================================================
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.following_id, NEW.follower_id, 'follow', NULL, NULL, NULL, NULL);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_follow ON public.followers;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- ===========================================================
-- DM MESSAGE notifications (notify all other participants)
-- ===========================================================
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec RECORD; preview TEXT;
BEGIN
  preview := COALESCE(LEFT(NEW.content, 140), '📎');
  FOR rec IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    PERFORM public.create_notification(rec.user_id, NEW.sender_id, 'message', NULL, NULL, NEW.conversation_id, preview);
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- ===========================================================
-- STORY REPLY notifications -> story owner
-- ===========================================================
CREATE OR REPLACE FUNCTION public.notify_on_story_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.stories WHERE id = NEW.story_id;
  PERFORM public.create_notification(owner, NEW.sender_id, 'story_reply', NULL, NEW.story_id, NULL, LEFT(NEW.content, 140));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_story_msg ON public.story_messages;
CREATE TRIGGER trg_notify_story_msg AFTER INSERT ON public.story_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_story_message();

-- ===========================================================
-- STORY LIKE notifications
-- ===========================================================
CREATE OR REPLACE FUNCTION public.notify_on_story_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.stories WHERE id = NEW.story_id;
  PERFORM public.create_notification(owner, NEW.user_id, 'story_like', NULL, NEW.story_id, NULL, NULL);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_story_like ON public.story_likes;
CREATE TRIGGER trg_notify_story_like AFTER INSERT ON public.story_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_story_like();

-- ===========================================================
-- Realtime: ensure story_messages broadcast for the owner UI
-- ===========================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.story_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
