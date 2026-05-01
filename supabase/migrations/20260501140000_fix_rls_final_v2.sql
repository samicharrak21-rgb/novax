-- Migration: Final and Robust RLS Fix for Conversations, Participants, and Messages.
-- Run this in your Supabase SQL Editor.

-- 1. CLEANUP: Drop all possible conflicting policies
DO $$ 
BEGIN
    -- Conversations
    DROP POLICY IF EXISTS "Authenticated create conv" ON public.conversations;
    DROP POLICY IF EXISTS "Conv insert by creator" ON public.conversations;
    DROP POLICY IF EXISTS "Conv readable by participants" ON public.conversations;
    DROP POLICY IF EXISTS "Participants update conv" ON public.conversations;
    DROP POLICY IF EXISTS "Allow authenticated to insert conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Allow participants and creators to select conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Allow participants to update conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

    -- Participants
    DROP POLICY IF EXISTS "Add participants flexible" ON public.conversation_participants;
    DROP POLICY IF EXISTS "Participants readable to participants" ON public.conversation_participants;
    DROP POLICY IF EXISTS "Remove self from conv" ON public.conversation_participants;
    DROP POLICY IF EXISTS "Allow adding participants" ON public.conversation_participants;
    DROP POLICY IF EXISTS "Allow participants to view each other" ON public.conversation_participants;
    DROP POLICY IF EXISTS "Allow removing self from conversation" ON public.conversation_participants;

    -- Messages
    DROP POLICY IF EXISTS "Messages readable by participants" ON public.messages;
    DROP POLICY IF EXISTS "Send messages as participant" ON public.messages;
    DROP POLICY IF EXISTS "Allow participants to send messages" ON public.messages;
END $$;

-- 2. CONVERSATIONS POLICIES
-- Allow ANY authenticated user to create a conversation.
CREATE POLICY "conversations_insert_policy"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow users to see conversations they are part of OR created.
CREATE POLICY "conversations_select_policy"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
    )
  );

-- Allow participants to update (e.g. last_message_at, title).
CREATE POLICY "conversations_update_policy"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
    )
  );

-- 3. CONVERSATION PARTICIPANTS POLICIES
-- Allow adding participants if you are authenticated.
CREATE POLICY "participants_insert_policy"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow viewing participants if you are in the same conversation.
CREATE POLICY "participants_select_policy"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = public.conversation_participants.conversation_id AND p.user_id = auth.uid()
    )
  );

-- Allow removing self.
CREATE POLICY "participants_delete_policy"
  ON public.conversation_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. MESSAGES POLICIES
-- Allow participants to send messages.
CREATE POLICY "messages_insert_policy"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND (
      EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = public.messages.conversation_id AND created_by = auth.uid()
      )
    )
  );

-- Allow participants to read messages.
CREATE POLICY "messages_select_policy"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = public.messages.conversation_id AND created_by = auth.uid()
    )
  );
