-- Migration: Fix RLS for conversations and participants to allow stable creation and messaging.

-- 1. CONVERSATIONS
-- Drop restrictive policies
DROP POLICY IF EXISTS "Conv insert by creator" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated create conv" ON public.conversations;
DROP POLICY IF EXISTS "Conv readable by participants" ON public.conversations;
DROP POLICY IF EXISTS "Participants update conv" ON public.conversations;

-- Allow any authenticated user to create a conversation
CREATE POLICY "Allow authenticated to insert conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow participants OR creators to view the conversation
CREATE POLICY "Allow participants and creators to select conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
    )
  );

-- Allow participants to update conversation details (like title/avatar)
CREATE POLICY "Allow participants to update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
    )
  );

-- 2. CONVERSATION PARTICIPANTS
-- Drop old policies
DROP POLICY IF EXISTS "Add participants flexible" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants readable to participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Remove self from conv" ON public.conversation_participants;

-- Allow adding participants if:
-- a) You are adding yourself
-- b) You are the creator of the conversation
-- c) You are already a participant (for group growth)
CREATE POLICY "Allow adding participants"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id AND user_id = auth.uid()
    )
  );

-- Allow viewing participants if you are in the same conversation
CREATE POLICY "Allow participants to view each other"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = public.conversation_participants.conversation_id AND p.user_id = auth.uid()
    )
  );

-- Allow removing self
CREATE POLICY "Allow removing self from conversation"
  ON public.conversation_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. MESSAGES
-- Ensure messages can be sent if you are a participant
DROP POLICY IF EXISTS "Send messages as participant" ON public.messages;
CREATE POLICY "Allow participants to send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
    )
  );
