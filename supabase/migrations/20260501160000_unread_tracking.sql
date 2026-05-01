-- 1. Add last_read_at to conversation_participants to track unread messages
ALTER TABLE public.conversation_participants 
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Function to mark a conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(conv_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = conv_id AND user_id = auth.uid();
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant access
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

-- 4. Update Realtime to include conversation_participants for unread count updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
