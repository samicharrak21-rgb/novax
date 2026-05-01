-- Ensure RLS allows authenticated users to create conversations they own.
-- Drops any prior INSERT policy variants and recreates with a proper check.

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated create conv" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conv insert by creator" ON public.conversations;

CREATE POLICY "Conv insert by creator"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);
