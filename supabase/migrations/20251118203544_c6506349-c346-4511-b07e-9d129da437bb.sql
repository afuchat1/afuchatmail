-- Fix RLS policy for emails table to allow users to insert their sent emails
DROP POLICY IF EXISTS "Users can insert their own sent emails" ON public.emails;

CREATE POLICY "Users can insert their own sent emails"
ON public.emails
FOR INSERT
WITH CHECK (auth.uid() = user_id);