-- Add email_address_id to user_settings to make settings per email address
ALTER TABLE public.user_settings 
ADD COLUMN email_address_id uuid REFERENCES public.email_addresses(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_user_settings_email_address_id ON public.user_settings(email_address_id);

-- Update RLS policies to use email_address_id
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

CREATE POLICY "Users can view settings for their email addresses"
  ON public.user_settings FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.email_addresses 
      WHERE id = email_address_id
    )
  );

CREATE POLICY "Users can update settings for their email addresses"
  ON public.user_settings FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.email_addresses 
      WHERE id = email_address_id
    )
  );

CREATE POLICY "Users can insert settings for their email addresses"
  ON public.user_settings FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.email_addresses 
      WHERE id = email_address_id
    )
  );

-- Add unique constraint to ensure one settings record per email address
ALTER TABLE public.user_settings 
ADD CONSTRAINT unique_settings_per_email_address UNIQUE (email_address_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.user_settings.email_address_id IS 'Links settings to a specific email address, allowing separate settings per account.';