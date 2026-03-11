
CREATE TABLE public.telegram_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_id bigint NOT NULL UNIQUE,
  telegram_username text,
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  link_code text UNIQUE,
  link_code_expires_at timestamp with time zone,
  notifications_enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own telegram links"
  ON public.telegram_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram links"
  ON public.telegram_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram links"
  ON public.telegram_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own telegram links"
  ON public.telegram_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
