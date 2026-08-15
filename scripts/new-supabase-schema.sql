\n-- === supabase/migrations/20251118200913_09a2e13e-4a7d-4db6-be61-1476ebce3f05.sql ===
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create email_addresses table
CREATE TABLE public.email_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_part TEXT NOT NULL,
  full_email TEXT GENERATED ALWAYS AS (local_part || '@afuchat.com') STORED,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(local_part),
  CONSTRAINT valid_local_part CHECK (local_part ~* '^[a-z0-9][a-z0-9._-]*[a-z0-9]$' AND length(local_part) >= 3 AND length(local_part) <= 30)
);

-- Enable RLS on email_addresses
ALTER TABLE public.email_addresses ENABLE ROW LEVEL SECURITY;

-- Email addresses policies
CREATE POLICY "Users can view their own email addresses"
  ON public.email_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email addresses"
  ON public.email_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email addresses"
  ON public.email_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email addresses"
  ON public.email_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();\n-- === supabase/migrations/20251118201518_afea34d3-9a1a-4628-8cd8-2aab4734c207.sql ===
-- Create folders/labels table
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inbox', 'sent', 'drafts', 'spam', 'trash', 'custom')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders"
  ON public.folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON public.folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.folders FOR DELETE
  USING (auth.uid() = user_id);

-- Create emails table
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address_id UUID REFERENCES public.email_addresses(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  thread_id UUID,
  reply_to TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emails"
  ON public.emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emails"
  ON public.emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails"
  ON public.emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
  ON public.emails FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_emails_user_id ON public.emails(user_id);
CREATE INDEX idx_emails_folder_id ON public.emails(folder_id);
CREATE INDEX idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX idx_emails_created_at ON public.emails(created_at DESC);
CREATE INDEX idx_folders_user_id ON public.folders(user_id);

-- Create function to initialize default folders for new users
CREATE OR REPLACE FUNCTION public.create_default_folders()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.folders (user_id, name, type, icon)
  VALUES 
    (NEW.id, 'Inbox', 'inbox', 'inbox'),
    (NEW.id, 'Sent', 'sent', 'send'),
    (NEW.id, 'Drafts', 'drafts', 'file-text'),
    (NEW.id, 'Spam', 'spam', 'alert-circle'),
    (NEW.id, 'Trash', 'trash', 'trash-2');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default folders when user signs up
CREATE TRIGGER on_user_create_folders
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_folders();\n-- === supabase/migrations/20251118202927_c8e2917c-6635-46ee-8370-c68dfe4d24ef.sql ===
-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_signature TEXT,
  default_reply_to TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_new_email BOOLEAN NOT NULL DEFAULT true,
  notification_replies BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();\n-- === supabase/migrations/20251118203544_c6506349-c346-4511-b07e-9d129da437bb.sql ===
-- Fix RLS policy for emails table to allow users to insert their sent emails
DROP POLICY IF EXISTS "Users can insert their own sent emails" ON public.emails;

CREATE POLICY "Users can insert their own sent emails"
ON public.emails
FOR INSERT
WITH CHECK (auth.uid() = user_id);\n-- === supabase/migrations/20251119041853_6d744e95-b048-4455-8cf5-d86bfb2a6190.sql ===
-- First, fix the RLS policy issue by ensuring we have the correct INSERT policy
DROP POLICY IF EXISTS "Users can create their own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can insert their own sent emails" ON public.emails;

-- Create a single, clear INSERT policy
CREATE POLICY "Allow users to insert emails"
ON public.emails
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Users can view their own templates and system templates"
ON public.email_templates
FOR SELECT
USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can create their own templates"
ON public.email_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own templates"
ON public.email_templates
FOR UPDATE
USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own templates"
ON public.email_templates
FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- Trigger for email_templates updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for email attachments
CREATE POLICY "Users can upload their own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Insert some default system templates
INSERT INTO public.email_templates (user_id, name, subject, body_html, body_text, is_system, category)
SELECT 
  id,
  'Welcome Email',
  'Welcome to AfuChat!',
  '<h1>Welcome to AfuChat!</h1><p>Thank you for joining us. We''re excited to have you on board.</p><p>Get started by exploring your new email inbox and sending your first message.</p><p>Best regards,<br>The AfuChat Team</p>',
  'Welcome to AfuChat!\n\nThank you for joining us. We''re excited to have you on board.\n\nGet started by exploring your new email inbox and sending your first message.\n\nBest regards,\nThe AfuChat Team',
  true,
  'welcome'
FROM auth.users
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.email_templates (user_id, name, subject, body_html, body_text, is_system, category)
SELECT 
  id,
  'Password Reset',
  'Reset Your Password',
  '<h1>Password Reset Request</h1><p>We received a request to reset your password.</p><p>If you didn''t make this request, please ignore this email.</p><p>Best regards,<br>The AfuChat Team</p>',
  'Password Reset Request\n\nWe received a request to reset your password.\n\nIf you didn''t make this request, please ignore this email.\n\nBest regards,\nThe AfuChat Team',
  true,
  'password-reset'
FROM auth.users
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.email_templates (user_id, name, subject, body_html, body_text, is_system, category)
SELECT 
  id,
  'Notification',
  'You Have a New Notification',
  '<h1>New Notification</h1><p>You have received a new notification.</p><p>Log in to your account to view details.</p><p>Best regards,<br>The AfuChat Team</p>',
  'New Notification\n\nYou have received a new notification.\n\nLog in to your account to view details.\n\nBest regards,\nThe AfuChat Team',
  true,
  'notification'
FROM auth.users
LIMIT 1
ON CONFLICT DO NOTHING;\n-- === supabase/migrations/20251119045156_bea3e13c-fed2-48c0-94c4-3b214e0c8ad9.sql ===
-- Enable realtime for emails table
ALTER TABLE public.emails REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;\n-- === supabase/migrations/20251119053909_9b99e4ab-65fb-4e1f-81a3-9c68fe0f0229.sql ===
-- Add alias support to email_addresses table
ALTER TABLE public.email_addresses
ADD COLUMN is_alias BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN alias_for_id UUID REFERENCES public.email_addresses(id) ON DELETE CASCADE;

-- Create index for faster alias lookups
CREATE INDEX idx_email_addresses_alias_for ON public.email_addresses(alias_for_id) WHERE alias_for_id IS NOT NULL;

-- Create function to prevent aliases pointing to other aliases
CREATE OR REPLACE FUNCTION public.check_alias_target()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if this is an alias
  IF NEW.is_alias = true AND NEW.alias_for_id IS NOT NULL THEN
    -- Check if the target is also an alias
    IF EXISTS (
      SELECT 1 FROM public.email_addresses 
      WHERE id = NEW.alias_for_id AND is_alias = true
    ) THEN
      RAISE EXCEPTION 'Aliases cannot point to other aliases';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER check_alias_target_trigger
  BEFORE INSERT OR UPDATE ON public.email_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.check_alias_target();\n-- === supabase/migrations/20251119053918_83926399-1c4a-4fcf-affb-7697abcfc208.sql ===
-- Fix search_path for check_alias_target function
CREATE OR REPLACE FUNCTION public.check_alias_target()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if this is an alias
  IF NEW.is_alias = true AND NEW.alias_for_id IS NOT NULL THEN
    -- Check if the target is also an alias
    IF EXISTS (
      SELECT 1 FROM public.email_addresses 
      WHERE id = NEW.alias_for_id AND is_alias = true
    ) THEN
      RAISE EXCEPTION 'Aliases cannot point to other aliases';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;\n-- === supabase/migrations/20251119054815_222c73b4-f803-4a7f-a448-97c6bcc3fa92.sql ===
-- Add snooze and importance fields to emails table
ALTER TABLE public.emails
ADD COLUMN snoozed_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_important BOOLEAN NOT NULL DEFAULT false;

-- Create index for snooze queries
CREATE INDEX idx_emails_snoozed_until ON public.emails(snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Create index for importance
CREATE INDEX idx_emails_important ON public.emails(is_important) WHERE is_important = true;

-- Function to automatically detect important emails
CREATE OR REPLACE FUNCTION public.detect_important_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_email_count INTEGER;
  has_important_keywords BOOLEAN;
BEGIN
  -- Check if sender has sent/received many emails with this user
  SELECT COUNT(*) INTO sender_email_count
  FROM public.emails
  WHERE user_id = NEW.user_id
    AND (from_address = NEW.from_address OR NEW.from_address = ANY(to_addresses))
    AND created_at > NOW() - INTERVAL '30 days';
  
  -- Check for important keywords in subject
  has_important_keywords := (
    NEW.subject ~* '(urgent|important|asap|critical|priority|action required|deadline|meeting|invoice|payment)'
  );
  
  -- Mark as important if:
  -- 1. Sender has 5+ emails in last 30 days (frequent contact)
  -- 2. Subject contains important keywords
  IF sender_email_count >= 5 OR has_important_keywords THEN
    NEW.is_important := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic importance detection
CREATE TRIGGER detect_important_email_trigger
  BEFORE INSERT ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_important_email();

-- Function to un-snooze emails
CREATE OR REPLACE FUNCTION public.unsnooze_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.emails
  SET snoozed_until = NULL
  WHERE snoozed_until IS NOT NULL
    AND snoozed_until <= NOW();
END;
$$;\n-- === supabase/migrations/20251119055450_f139a7f7-c452-4fe7-8a0f-7041b4e33b4d.sql ===
-- Add RLS policies for email-attachments storage bucket

-- Policy: Users can view their own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can upload their own attachments
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own attachments
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);\n-- === supabase/migrations/20251119120440_7d18d6f1-8fb5-4001-9de6-ea8a53a57210.sql ===
-- Add deleted_at column to track when emails were moved to trash
ALTER TABLE public.emails 
ADD COLUMN deleted_at timestamp with time zone;

-- Create function to permanently delete emails that have been in trash for 7+ days
CREATE OR REPLACE FUNCTION public.cleanup_old_trash_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.emails
  WHERE deleted_at IS NOT NULL
    AND deleted_at <= NOW() - INTERVAL '7 days';
END;
$$;

-- Add comment explaining the retention policy
COMMENT ON COLUMN public.emails.deleted_at IS 'Timestamp when email was moved to trash. Emails are permanently deleted after 7 days.';\n-- === supabase/migrations/20251119120547_983b97d8-63f0-4ae2-8033-73bdc1616ca4.sql ===
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-trash-emails',
  '0 2 * * *',
  $$SELECT public.cleanup_old_trash_emails()$$
);\n-- === supabase/migrations/20251119121229_be6075c5-e1ab-4dd8-bb32-a1253ff81929.sql ===
-- Add original_folder_id to track where email came from before deletion
ALTER TABLE public.emails 
ADD COLUMN original_folder_id uuid REFERENCES public.folders(id);

-- Add index for better performance when filtering by original folder
CREATE INDEX idx_emails_original_folder_id ON public.emails(original_folder_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.emails.original_folder_id IS 'Stores the folder_id before email was moved to trash, used for restore functionality.';\n-- === supabase/migrations/20251119122132_cf7dfc4d-1f7f-45b0-97fd-edc3a0cd9266.sql ===
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
COMMENT ON COLUMN public.user_settings.email_address_id IS 'Links settings to a specific email address, allowing separate settings per account.';\n-- === supabase/migrations/20251119123106_f4fec5df-977e-41f4-921f-3d36ef440378.sql ===
-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_address_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);\n-- === supabase/migrations/20251216080350_ec525093-55fa-4800-b959-caa8f81b5d7f.sql ===
-- OAuth Applications (registered third-party apps)
CREATE TABLE public.oauth_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  client_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:mailbox', 'read:messages'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OAuth Authorization Codes (temporary codes for token exchange)
CREATE TABLE public.oauth_authorization_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  application_id UUID NOT NULL REFERENCES public.oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_address_id UUID NOT NULL REFERENCES public.email_addresses(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OAuth Access Tokens
CREATE TABLE public.oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  refresh_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  application_id UUID NOT NULL REFERENCES public.oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_address_id UUID NOT NULL REFERENCES public.email_addresses(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  refresh_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_applications
CREATE POLICY "Users can view their own OAuth apps"
  ON public.oauth_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OAuth apps"
  ON public.oauth_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OAuth apps"
  ON public.oauth_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth apps"
  ON public.oauth_applications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for oauth_authorization_codes
CREATE POLICY "Users can view their own auth codes"
  ON public.oauth_authorization_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own auth codes"
  ON public.oauth_authorization_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for oauth_tokens
CREATE POLICY "Users can view their own tokens"
  ON public.oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own tokens"
  ON public.oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_oauth_tokens_access_token ON public.oauth_tokens(access_token) WHERE NOT revoked;
CREATE INDEX idx_oauth_tokens_refresh_token ON public.oauth_tokens(refresh_token) WHERE NOT revoked;
CREATE INDEX idx_oauth_auth_codes_code ON public.oauth_authorization_codes(code) WHERE NOT used;

-- Trigger for updated_at
CREATE TRIGGER update_oauth_applications_updated_at
  BEFORE UPDATE ON public.oauth_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();\n-- === supabase/migrations/20251216112527_680eb916-7444-411a-b411-8e4c9e77550d.sql ===
-- Add policy to allow anyone to look up OAuth applications by client_id for authorization
CREATE POLICY "Anyone can view OAuth apps for authorization" 
ON public.oauth_applications 
FOR SELECT 
USING (true);\n-- === supabase/migrations/20251217203034_252928cd-69b3-4df7-bb34-74f6a55bd969.sql ===
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check email address limit
CREATE OR REPLACE FUNCTION public.check_email_address_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT public.has_role(NEW.user_id, 'admin') INTO is_admin;
  
  -- Admins can create unlimited
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Count existing non-alias email addresses for this user
  SELECT COUNT(*) INTO email_count
  FROM public.email_addresses
  WHERE user_id = NEW.user_id
    AND is_alias = false;
  
  -- Limit to 3 for regular users
  IF email_count >= 3 THEN
    RAISE EXCEPTION 'Email address limit reached. Regular users can only create up to 3 email addresses.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce the limit
CREATE TRIGGER enforce_email_address_limit
BEFORE INSERT ON public.email_addresses
FOR EACH ROW
EXECUTE FUNCTION public.check_email_address_limit();\n-- === supabase/migrations/20251217203349_020c44e8-6283-41eb-89ea-7900d71f22e7.sql ===
-- Function for admins to get all users with their email counts
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  email_count bigint,
  is_admin boolean,
  email_addresses text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    ea.user_id,
    COUNT(ea.id)::bigint as email_count,
    COALESCE(public.has_role(ea.user_id, 'admin'), false) as is_admin,
    array_agg(ea.full_email ORDER BY ea.created_at) as email_addresses,
    MIN(ea.created_at) as created_at
  FROM public.email_addresses ea
  WHERE ea.is_alias = false
  GROUP BY ea.user_id
  ORDER BY email_count DESC;
END;
$$;

-- Function for admins to toggle user admin role
CREATE OR REPLACE FUNCTION public.admin_toggle_user_role(_target_user_id uuid, _make_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  IF _make_admin THEN
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remove admin role
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = 'admin';
  END IF;

  RETURN true;
END;
$$;\n-- === supabase/migrations/20251217204110_ab9561c0-abb8-40cf-84a2-ba924a1b6531.sql ===
-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  auth_email text,
  email_count bigint,
  is_admin boolean,
  email_addresses text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    ea.user_id,
    au.email::text as auth_email,
    COUNT(ea.id)::bigint as email_count,
    COALESCE(public.has_role(ea.user_id, 'admin'), false) as is_admin,
    array_agg(ea.full_email ORDER BY ea.created_at) as email_addresses,
    MIN(ea.created_at) as created_at
  FROM public.email_addresses ea
  LEFT JOIN auth.users au ON au.id = ea.user_id
  WHERE ea.is_alias = false
  GROUP BY ea.user_id, au.email
  ORDER BY email_count DESC;
END;
$$;\n-- === supabase/migrations/20251217204853_4a626c70-8ea9-44b5-836c-b633026cbba4.sql ===
-- Add banned_at column to profiles table for account banning
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL;

-- Function for admin to get user emails
CREATE OR REPLACE FUNCTION public.admin_get_user_emails(_target_user_id uuid)
RETURNS TABLE (
  id uuid,
  subject text,
  from_address text,
  to_addresses text[],
  body_text text,
  is_read boolean,
  is_starred boolean,
  created_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  folder_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.subject,
    e.from_address,
    e.to_addresses,
    e.body_text,
    e.is_read,
    e.is_starred,
    e.created_at,
    e.sent_at,
    e.received_at,
    f.type as folder_type
  FROM public.emails e
  LEFT JOIN public.folders f ON f.id = e.folder_id
  WHERE e.user_id = _target_user_id
  ORDER BY e.created_at DESC
  LIMIT 100;
END;
$$;

-- Function to ban/unban user
CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(_target_user_id uuid, _ban boolean, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  IF _ban THEN
    UPDATE public.profiles
    SET banned_at = now(), ban_reason = _reason
    WHERE id = _target_user_id;
  ELSE
    UPDATE public.profiles
    SET banned_at = NULL, ban_reason = NULL
    WHERE id = _target_user_id;
  END IF;

  RETURN true;
END;
$$;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND banned_at IS NOT NULL
  )
$$;\n-- === supabase/migrations/20251217205745_d1d42e9e-bd2c-4156-b476-cdc453aeb2df.sql ===
-- Drop existing functions first to change return types
DROP FUNCTION IF EXISTS public.admin_get_user_emails(uuid);
DROP FUNCTION IF EXISTS public.admin_get_all_users();

-- Fix OAuth client secrets exposure
-- 1. Drop the overly permissive policy that exposes client_secret
DROP POLICY IF EXISTS "Anyone can view OAuth apps for authorization" ON oauth_applications;

-- 2. Create a secure view that only exposes safe columns for authorization flow
CREATE OR REPLACE VIEW public.oauth_app_public_info AS
SELECT id, name, client_id, redirect_uris, scopes
FROM oauth_applications;

-- 3. Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.oauth_app_public_info TO authenticated;
GRANT SELECT ON public.oauth_app_public_info TO anon;

-- 4. Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create admin_get_user_emails with truncated body_text and audit logging
CREATE FUNCTION public.admin_get_user_emails(_target_user_id uuid)
RETURNS TABLE (
  id uuid,
  subject text,
  from_address text,
  to_addresses text[],
  body_text text,
  is_read boolean,
  is_starred boolean,
  folder_type text,
  created_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'view_user_emails', _target_user_id, jsonb_build_object('action_time', now()));
  
  RETURN QUERY
  SELECT 
    e.id,
    e.subject,
    e.from_address,
    e.to_addresses,
    CASE 
      WHEN e.body_text IS NULL THEN NULL
      ELSE LEFT(e.body_text, 200) || CASE WHEN LENGTH(e.body_text) > 200 THEN '...' ELSE '' END
    END as body_text,
    e.is_read,
    e.is_starred,
    COALESCE(f.type, 'unknown') as folder_type,
    e.created_at,
    e.sent_at,
    e.received_at
  FROM emails e
  LEFT JOIN folders f ON e.folder_id = f.id
  WHERE e.user_id = _target_user_id
  ORDER BY COALESCE(e.received_at, e.sent_at, e.created_at) DESC
  LIMIT 100;
END;
$$;

-- 6. Create admin_get_all_users with audit logging
CREATE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  auth_email text,
  email_addresses text[],
  email_count bigint,
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'view_all_users', NULL, jsonb_build_object('action_time', now()));
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    au.email as auth_email,
    ARRAY_AGG(ea.full_email ORDER BY ea.is_primary DESC, ea.created_at) FILTER (WHERE ea.full_email IS NOT NULL) as email_addresses,
    COUNT(ea.id) as email_count,
    EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') as is_admin,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN email_addresses ea ON p.id = ea.user_id AND ea.is_alias = false
  GROUP BY p.id, au.email, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

-- 7. Update admin_toggle_user_ban to add audit logging
CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(_target_user_id uuid, _ban boolean, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN _ban THEN 'ban_user' ELSE 'unban_user' END, 
    _target_user_id, 
    jsonb_build_object('reason', _reason, 'action_time', now())
  );
  
  UPDATE profiles
  SET 
    banned_at = CASE WHEN _ban THEN now() ELSE NULL END,
    ban_reason = CASE WHEN _ban THEN _reason ELSE NULL END
  WHERE id = _target_user_id;
  
  RETURN true;
END;
$$;

-- 8. Update admin_toggle_user_role to add audit logging
CREATE OR REPLACE FUNCTION public.admin_toggle_user_role(_target_user_id uuid, _make_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    auth.uid(), 
    CASE WHEN _make_admin THEN 'grant_admin' ELSE 'revoke_admin' END, 
    _target_user_id, 
    jsonb_build_object('action_time', now())
  );
  
  IF _make_admin THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (_target_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles
    WHERE user_id = _target_user_id AND role = 'admin';
  END IF;
  
  RETURN true;
END;
$$;\n-- === supabase/migrations/20251217205757_0cbfe4db-8793-4f85-8a66-762418d36cee.sql ===
-- Fix security definer view by recreating as security invoker
DROP VIEW IF EXISTS public.oauth_app_public_info;

CREATE VIEW public.oauth_app_public_info 
WITH (security_invoker = true)
AS
SELECT id, name, client_id, redirect_uris, scopes
FROM oauth_applications;

-- Grant SELECT on the view
GRANT SELECT ON public.oauth_app_public_info TO authenticated;
GRANT SELECT ON public.oauth_app_public_info TO anon;\n-- === supabase/migrations/20251217210304_b8b7edd1-9100-4fc4-9433-75adf794f5a9.sql ===
-- Fix type mismatch in admin_get_all_users function
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  user_id uuid,
  auth_email text,
  email_addresses text[],
  email_count bigint,
  is_admin boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'view_all_users', NULL, jsonb_build_object('action_time', now()));
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    au.email::text as auth_email,
    ARRAY_AGG(ea.full_email ORDER BY ea.is_primary DESC, ea.created_at) FILTER (WHERE ea.full_email IS NOT NULL) as email_addresses,
    COUNT(ea.id) as email_count,
    EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') as is_admin,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN email_addresses ea ON p.id = ea.user_id AND ea.is_alias = false
  GROUP BY p.id, au.email, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;\n-- === supabase/migrations/20260217230221_1781947e-edf0-4fd6-84ed-8c9b2a8f1a16.sql ===
-- Add scheduled_at column for scheduled send feature
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient querying of scheduled emails
CREATE INDEX IF NOT EXISTS idx_emails_scheduled_at ON public.emails (scheduled_at) WHERE scheduled_at IS NOT NULL;\n-- === supabase/migrations/20260311005604_53449d28-52a2-42f8-813d-2611d9522d11.sql ===

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
\n-- === supabase/migrations/20260416000000_skypay_subscriptions.sql ===
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  client_reference text unique,
  skypay_reference_id text unique,
  plan_id text check (plan_id in ('professional', 'business')),
  amount integer not null check (amount > 0),
  currency text not null default 'UGX',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  method text,
  buyer_email text,
  seller_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('starter', 'professional', 'business')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'expired')),
  skypay_reference_id text unique references public.payment_transactions(skypay_reference_id) on delete set null,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_user_id_idx on public.payment_transactions(user_id);
create index if not exists payment_transactions_status_idx on public.payment_transactions(status);
create index if not exists subscriptions_user_id_status_idx on public.subscriptions(user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payment_transactions_updated_at on public.payment_transactions;
create trigger set_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.payment_transactions enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own payment transactions" on public.payment_transactions;
create policy "Users can view own payment transactions"
on public.payment_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);\n-- === supabase/migrations/20260417083801_8c933881-f654-4367-89f7-2c385935fa46.sql ===
-- Helper: returns the user's effective plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND plan_id = 'business'
        AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN 'business'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND plan_id = 'professional'
        AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN 'professional'
    ELSE 'starter'
  END;
$$;

-- Plan-aware email address limit
CREATE OR REPLACE FUNCTION public.check_email_address_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count INTEGER;
  user_plan TEXT;
  max_allowed INTEGER;
BEGIN
  -- Aliases are unlimited for everyone
  IF NEW.is_alias = true THEN
    RETURN NEW;
  END IF;

  user_plan := public.get_user_plan(NEW.user_id);

  -- Admins and Business get unlimited
  IF user_plan IN ('admin', 'business') THEN
    RETURN NEW;
  END IF;

  -- Plan-based caps for primary addresses
  IF user_plan = 'professional' THEN
    max_allowed := 3;
  ELSE
    max_allowed := 1; -- starter / free
  END IF;

  SELECT COUNT(*) INTO email_count
  FROM public.email_addresses
  WHERE user_id = NEW.user_id
    AND is_alias = false;

  IF email_count >= max_allowed THEN
    RAISE EXCEPTION 'Email address limit reached for your plan. Upgrade at /pricing to add more addresses.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;\n-- === supabase/migrations/20260421153116_2d2b3c94-d9b0-426f-a4ab-bb07321a42b5.sql ===
-- Block non-admins from creating alias rows.
-- Primary-address limits remain handled by check_email_address_limit().
CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_alias = true THEN
    -- Only admins may create aliases
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can create email aliases.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_alias_admin_only ON public.email_addresses;
CREATE TRIGGER trg_check_alias_admin_only
BEFORE INSERT ON public.email_addresses
FOR EACH ROW
EXECUTE FUNCTION public.check_alias_admin_only();\n-- === supabase/migrations/20260421153302_5a8fabcf-55e9-42f6-93d3-28ac39f9dad0.sql ===
-- Extend the new-user handler to also reserve the primary mailbox.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  derived_username text;
  candidate text;
  i integer := 0;
BEGIN
  -- 1. Profile (existing behavior)
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- 2. Determine the desired local-part:
  --    prefer the explicit `username` from sign-up metadata,
  --    fall back to the local part of the auth email.
  derived_username := lower(COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ));
  -- Normalize: keep only safe chars
  derived_username := regexp_replace(derived_username, '[^a-z0-9._-]', '', 'g');
  IF derived_username IS NULL OR length(derived_username) < 2 THEN
    derived_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  -- 3. Reserve a unique local_part (in case of collision, append a numeric suffix)
  candidate := derived_username;
  WHILE EXISTS (SELECT 1 FROM public.email_addresses WHERE local_part = candidate) LOOP
    i := i + 1;
    candidate := derived_username || i::text;
    EXIT WHEN i > 50;
  END LOOP;

  -- 4. Insert the primary mailbox. SECURITY DEFINER bypasses our triggers'
  --    auth.uid() checks during signup (auth.uid() may be null here).
  INSERT INTO public.email_addresses (user_id, local_part, full_email, is_primary, is_alias)
  VALUES (NEW.id, candidate, candidate || '@afuchat.com', true, false)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Make the alias-admin-only check tolerant of system inserts (auth.uid() IS NULL).
CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_alias = true THEN
    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can create email aliases.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;\n-- === supabase/migrations/20260421154918_afe2a09e-4f15-4bcb-8c24-30040b2f913d.sql ===
-- 1. Public RPC for username availability so it works BEFORE the user is authenticated.
--    RLS on email_addresses only lets users see their own row, so the live availability
--    check on /auth would otherwise miss admin-created or other users' addresses.
CREATE OR REPLACE FUNCTION public.username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.email_addresses
    WHERE local_part = lower(_username)
  );
$$;

REVOKE ALL ON FUNCTION public.username_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

-- 2. Profile picture support.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_color text;

-- 3. Public storage bucket for user avatars.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: each user can manage files inside a folder named with their user id.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatars are publicly readable' AND tablename = 'objects') THEN
    CREATE POLICY "Avatars are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own avatar"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own avatar"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own avatar"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
\n-- === supabase/migrations/20260422093751_572b1d94-d95c-4e95-b30e-7537bbe88417.sql ===
-- Harden handle_new_user with detailed exception logging so we can see the real error.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  derived_username text;
  candidate text;
  i integer := 0;
  err_context text;
  err_detail text;
  err_message text;
  err_state text;
BEGIN
  -- 1. Profile
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE, err_detail = PG_EXCEPTION_DETAIL, err_context = PG_EXCEPTION_CONTEXT;
    RAISE WARNING 'handle_new_user[profiles] sqlstate=% message=% detail=% context=%', err_state, err_message, err_detail, err_context;
  END;

  -- 2. Derive username
  derived_username := lower(COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ));
  derived_username := regexp_replace(derived_username, '[^a-z0-9._-]', '', 'g');
  -- Strip leading/trailing non-alphanum to satisfy valid_local_part check
  derived_username := regexp_replace(derived_username, '^[._-]+', '', 'g');
  derived_username := regexp_replace(derived_username, '[._-]+$', '', 'g');
  IF derived_username IS NULL OR length(derived_username) < 3 THEN
    derived_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF length(derived_username) > 30 THEN
    derived_username := substr(derived_username, 1, 30);
  END IF;

  -- 3. Reserve a unique local_part
  candidate := derived_username;
  WHILE EXISTS (SELECT 1 FROM public.email_addresses WHERE local_part = candidate) LOOP
    i := i + 1;
    candidate := substr(derived_username, 1, 28) || i::text;
    EXIT WHEN i > 50;
  END LOOP;

  -- 4. Insert primary mailbox with detailed error capture
  BEGIN
    INSERT INTO public.email_addresses (user_id, local_part, full_email, is_primary, is_alias)
    VALUES (NEW.id, candidate, candidate || '@afuchat.com', true, false);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE, err_detail = PG_EXCEPTION_DETAIL, err_context = PG_EXCEPTION_CONTEXT;
    RAISE WARNING 'handle_new_user[email_addresses] sqlstate=% message=% detail=% context=% candidate=%', err_state, err_message, err_detail, err_context, candidate;
    -- Re-raise so signup fails clearly rather than silently leaving user without mailbox
    RAISE EXCEPTION 'Failed to provision mailbox for %: % (sqlstate %)', candidate, err_message, err_state;
  END;

  RETURN NEW;
END;
$function$;\n-- === supabase/migrations/20260422093832_49398590-9fb1-4339-ba0e-69e9699b9260.sql ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  derived_username text;
  candidate text;
  i integer := 0;
  err_context text;
  err_detail text;
  err_message text;
  err_state text;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE;
    RAISE WARNING 'handle_new_user[profiles] sqlstate=% message=%', err_state, err_message;
  END;

  derived_username := lower(COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ));
  derived_username := regexp_replace(derived_username, '[^a-z0-9._-]', '', 'g');
  derived_username := regexp_replace(derived_username, '^[._-]+', '', 'g');
  derived_username := regexp_replace(derived_username, '[._-]+$', '', 'g');
  IF derived_username IS NULL OR length(derived_username) < 3 THEN
    derived_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  IF length(derived_username) > 30 THEN
    derived_username := substr(derived_username, 1, 30);
  END IF;

  candidate := derived_username;
  WHILE EXISTS (SELECT 1 FROM public.email_addresses WHERE local_part = candidate) LOOP
    i := i + 1;
    candidate := substr(derived_username, 1, 28) || i::text;
    EXIT WHEN i > 50;
  END LOOP;

  BEGIN
    -- Note: full_email is a GENERATED column; do not insert into it.
    INSERT INTO public.email_addresses (user_id, local_part, is_primary, is_alias)
    VALUES (NEW.id, candidate, true, false);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_message = MESSAGE_TEXT, err_state = RETURNED_SQLSTATE, err_context = PG_EXCEPTION_CONTEXT;
    RAISE WARNING 'handle_new_user[email_addresses] sqlstate=% message=% context=% candidate=%', err_state, err_message, err_context, candidate;
    RAISE EXCEPTION 'Failed to provision mailbox for %: % (sqlstate %)', candidate, err_message, err_state;
  END;

  RETURN NEW;
END;
$function$;\n-- === supabase/migrations/20260422100016_175ebd92-e422-4fb9-87bd-e34e3a420fbc.sql ===
-- Allow paid users to create aliases, with caps enforced in the trigger.
-- Starter users: 0 aliases. Professional: 5. Business: 25. Admin: unlimited.

CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_alias_count integer;
  v_max integer;
BEGIN
  IF NEW.is_alias = true THEN
    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- Admins always allowed, unlimited.
    IF public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;

    v_plan := public.get_user_plan(NEW.user_id);

    IF v_plan = 'business' THEN
      v_max := 25;
    ELSIF v_plan = 'professional' THEN
      v_max := 5;
    ELSE
      RAISE EXCEPTION 'Aliases are available on the Professional plan and above. Upgrade at /pricing to add aliases.'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT COUNT(*) INTO v_alias_count
    FROM public.email_addresses
    WHERE user_id = NEW.user_id
      AND is_alias = true;

    IF v_alias_count >= v_max THEN
      RAISE EXCEPTION 'Alias limit reached for your plan (% used of %). Upgrade at /pricing for more aliases.', v_alias_count, v_max
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;\n-- === supabase/migrations/20260424090700_unlimited_aliases_all_plans.sql ===
-- Per-plan alias caps that match the public Pricing page:
--   * Starter      — 1 alias
--   * Professional — 5 aliases
--   * Business     — 25 aliases
--   * Admin        — unlimited
--
-- Replaces the previous trigger which blocked Starter entirely and used
-- different numeric caps. SECURITY DEFINER / system inserts (auth.uid IS NULL)
-- continue to bypass the check so seed data and handle_new_user keep working.

CREATE OR REPLACE FUNCTION public.check_alias_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_plan text;
  v_cap int;
  v_count int;
BEGIN
  IF NEW.is_alias = true THEN
    v_uid := auth.uid();

    -- Allow system / SECURITY DEFINER inserts (no auth context).
    IF v_uid IS NULL THEN
      RETURN NEW;
    END IF;

    -- Admins always allowed.
    IF public.has_role(v_uid, 'admin') THEN
      RETURN NEW;
    END IF;

    v_plan := public.get_user_plan(v_uid);

    IF v_plan = 'business' THEN
      v_cap := 25;
    ELSIF v_plan = 'professional' THEN
      v_cap := 5;
    ELSE
      -- Starter (or any unknown tier) gets exactly 1 alias.
      v_cap := 1;
    END IF;

    SELECT count(*)
      INTO v_count
      FROM public.email_addresses
     WHERE user_id = NEW.user_id
       AND is_alias = true;

    IF v_count >= v_cap THEN
      RAISE EXCEPTION
        'Alias limit reached for the % plan (% of % used). Upgrade your plan to add more aliases.',
        v_plan, v_count, v_cap
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
\n-- === supabase/migrations/20260424100000_storage_quotas.sql ===
-- Attachment storage quotas per plan, matching the public Pricing page:
--   * Starter      —   500 MB
--   * Professional —   5 GB
--   * Business     —  25 GB
--   * Admin        —  unlimited (returns -1 sentinel)
--
-- Usage is computed by summing the `size` field of every entry in the
-- `attachments` JSONB array on the `emails` table for a given user. The
-- companion edge functions (send-email, receive-email) call these helpers
-- to enforce the quota at write time.

-- ---------- usage ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_storage_used_bytes(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM((att->>'size')::bigint), 0)::bigint
  FROM public.emails e
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(e.attachments) = 'array' THEN e.attachments
      ELSE '[]'::jsonb
    END
  ) AS att
  WHERE e.user_id = _user_id
    AND att ? 'size'
    AND jsonb_typeof(att->'size') = 'number';
$$;

GRANT EXECUTE ON FUNCTION public.get_user_storage_used_bytes(uuid) TO authenticated, service_role;

-- ---------- quota ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_storage_quota_bytes(_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN -1;
  END IF;

  v_plan := public.get_user_plan(_user_id);

  IF v_plan = 'business' THEN
    RETURN 25::bigint * 1024 * 1024 * 1024;        -- 25 GB
  ELSIF v_plan = 'professional' THEN
    RETURN 5::bigint * 1024 * 1024 * 1024;         -- 5 GB
  ELSE
    RETURN 500::bigint * 1024 * 1024;              -- 500 MB
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_storage_quota_bytes(uuid) TO authenticated, service_role;
\n-- === supabase/migrations/20260424110000_email_addresses_domain_column.sql ===
-- Prepare email_addresses to support custom domains alongside @afuchat.com.
--
-- Before: full_email is a GENERATED column hardcoded to local_part || '@afuchat.com',
--         and local_part is globally unique.
-- After:  full_email is GENERATED from local_part || '@' || domain,
--         (local_part, domain) is unique, and a `domain` column defaults to
--         'afuchat.com' so every existing row stays unchanged after the rewrite.

-- ── 1. Drop existing single-column unique constraint on local_part ─────────
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.email_addresses'::regclass
       AND contype  = 'u'
       AND array_length(conkey, 1) = 1
       AND conkey = ARRAY[(
         SELECT attnum
           FROM pg_attribute
          WHERE attrelid = 'public.email_addresses'::regclass
            AND attname  = 'local_part'
       )]
  LOOP
    EXECUTE format('ALTER TABLE public.email_addresses DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

-- ── 2. Drop the old generated full_email column ────────────────────────────
ALTER TABLE public.email_addresses DROP COLUMN IF EXISTS full_email;

-- ── 3. Add domain column with afuchat.com default + format check ───────────
ALTER TABLE public.email_addresses
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'afuchat.com';

ALTER TABLE public.email_addresses
  DROP CONSTRAINT IF EXISTS valid_email_domain;
ALTER TABLE public.email_addresses
  ADD CONSTRAINT valid_email_domain
  CHECK (domain ~* '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$');

-- ── 4. Recreate full_email as a generated column over local_part || domain ─
ALTER TABLE public.email_addresses
  ADD COLUMN full_email text
    GENERATED ALWAYS AS (local_part || '@' || domain) STORED;

-- ── 5. New uniqueness on (local_part, domain) ──────────────────────────────
ALTER TABLE public.email_addresses
  ADD CONSTRAINT email_addresses_local_part_domain_key UNIQUE (local_part, domain);

-- ── 6. Helpful index for the receive-email lookup by full_email ────────────
CREATE INDEX IF NOT EXISTS email_addresses_full_email_idx
  ON public.email_addresses (full_email);

-- ── 7. username_available now scoped to the public @afuchat.com pool ──────
--    (custom-domain local parts are checked separately when creating)
CREATE OR REPLACE FUNCTION public.username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1
      FROM public.email_addresses
     WHERE local_part = lower(_username)
       AND domain     = 'afuchat.com'
  );
$$;

REVOKE ALL ON FUNCTION public.username_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;
\n-- === supabase/migrations/20260424110100_custom_domains.sql ===
-- Custom domain ownership records, used so Pro+ users can route mail to their
-- own domains. The actual MX/DKIM is configured externally with the mail
-- provider; this table tracks ownership and the TXT verification token.

CREATE TABLE IF NOT EXISTS public.custom_domains (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain             text NOT NULL,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status             text NOT NULL DEFAULT 'pending',
  verified_at        timestamptz,
  last_checked_at    timestamptz,
  last_error         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custom_domains_status_check
    CHECK (status IN ('pending','verified','failed')),
  CONSTRAINT custom_domains_domain_format
    CHECK (domain ~* '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  CONSTRAINT custom_domains_not_afuchat
    CHECK (domain NOT IN ('afuchat.com'))
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_domains_domain_key
  ON public.custom_domains (lower(domain));

CREATE INDEX IF NOT EXISTS custom_domains_user_idx
  ON public.custom_domains (user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_custom_domain_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_custom_domains_updated_at ON public.custom_domains;
CREATE TRIGGER trg_custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.touch_custom_domain_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own domains"          ON public.custom_domains;
DROP POLICY IF EXISTS "Admins see all domains"         ON public.custom_domains;
DROP POLICY IF EXISTS "Users insert own domains"       ON public.custom_domains;
DROP POLICY IF EXISTS "Users delete own domains"       ON public.custom_domains;
DROP POLICY IF EXISTS "Users cannot directly verify"   ON public.custom_domains;

CREATE POLICY "Users see own domains"
  ON public.custom_domains FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins see all domains"
  ON public.custom_domains FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own domains"
  ON public.custom_domains FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.get_user_plan(auth.uid()) IN ('professional','business')
    )
  );

CREATE POLICY "Users delete own domains"
  ON public.custom_domains FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Updates restricted: clients can never flip status themselves, only the
-- service role (via the verify-custom-domain edge function) can.
CREATE POLICY "Users cannot directly verify"
  ON public.custom_domains FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

-- ── Helper: create an email address on a verified custom domain ──────────
-- Bypasses RLS via SECURITY DEFINER while enforcing ownership + plan tier.
CREATE OR REPLACE FUNCTION public.create_custom_domain_address(
  _domain_id  uuid,
  _local_part text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_domain text;
  v_status text;
  v_plan   text;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_plan := public.get_user_plan(v_uid);
  IF NOT (public.has_role(v_uid, 'admin') OR v_plan IN ('professional','business')) THEN
    RAISE EXCEPTION 'Custom domain addresses require the Professional plan or above.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT user_id, domain, status
    INTO v_owner, v_domain, v_status
    FROM public.custom_domains
   WHERE id = _domain_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Domain not found.';
  END IF;

  IF v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'You do not own this domain.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'verified' THEN
    RAISE EXCEPTION 'Domain is not verified yet. Add the DNS TXT record and verify first.';
  END IF;

  INSERT INTO public.email_addresses (user_id, local_part, domain, is_primary, is_alias)
  VALUES (v_uid, lower(_local_part), v_domain, false, false)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_custom_domain_address(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_custom_domain_address(uuid, text) TO authenticated;
\n-- === supabase/migrations/20260424120000_status_history.sql ===
-- Public, shared status history. Everyone reads the same numbers; only the
-- service role (via the status-probe edge function) writes to it.

-- ── status_latest: current snapshot per service ────────────────────────────
CREATE TABLE IF NOT EXISTS public.status_latest (
  service_id  text PRIMARY KEY,
  state       text NOT NULL,                       -- operational | degraded | down
  ms          integer NOT NULL DEFAULT 0,
  checked_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT status_latest_state_check
    CHECK (state IN ('operational','degraded','down'))
);

-- ── status_daily: rolled-up daily bucket per service (UTC days) ────────────
CREATE TABLE IF NOT EXISTS public.status_daily (
  service_id    text NOT NULL,
  day           date NOT NULL,                     -- UTC calendar day
  total         integer NOT NULL DEFAULT 0,
  ok            integer NOT NULL DEFAULT 0,
  fail          integer NOT NULL DEFAULT 0,
  slow          integer NOT NULL DEFAULT 0,        -- ok but >1500ms
  ms_min        integer NOT NULL DEFAULT 0,
  ms_max        integer NOT NULL DEFAULT 0,
  ms_sum        bigint  NOT NULL DEFAULT 0,
  last_fail_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, day)
);

CREATE INDEX IF NOT EXISTS status_daily_day_idx ON public.status_daily (day DESC);

-- ── RLS: everyone can read, nobody can write directly ─────────────────────
ALTER TABLE public.status_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_daily  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_latest_public_read" ON public.status_latest;
DROP POLICY IF EXISTS "status_daily_public_read"  ON public.status_daily;

CREATE POLICY "status_latest_public_read"
  ON public.status_latest FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "status_daily_public_read"
  ON public.status_daily FOR SELECT TO anon, authenticated
  USING (true);

-- (No INSERT/UPDATE/DELETE policies — only the service role can write.)

-- ── record_status_check: atomic upsert of a single probe result ───────────
CREATE OR REPLACE FUNCTION public.record_status_check(
  _service_id  text,
  _ok          boolean,
  _ms          integer,
  _checked_at  timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_state text;
  v_slow  boolean := _ok AND _ms > 1500;
  v_day   date    := (_checked_at AT TIME ZONE 'UTC')::date;
BEGIN
  v_state := CASE
    WHEN NOT _ok THEN 'down'
    WHEN v_slow  THEN 'degraded'
    ELSE 'operational'
  END;

  -- Upsert latest snapshot
  INSERT INTO public.status_latest (service_id, state, ms, checked_at)
  VALUES (_service_id, v_state, _ms, _checked_at)
  ON CONFLICT (service_id) DO UPDATE
    SET state      = EXCLUDED.state,
        ms         = EXCLUDED.ms,
        checked_at = EXCLUDED.checked_at;

  -- Upsert daily rollup
  INSERT INTO public.status_daily (
    service_id, day, total, ok, fail, slow,
    ms_min, ms_max, ms_sum, last_fail_at, updated_at
  )
  VALUES (
    _service_id, v_day,
    1,
    CASE WHEN _ok THEN 1 ELSE 0 END,
    CASE WHEN _ok THEN 0 ELSE 1 END,
    CASE WHEN v_slow THEN 1 ELSE 0 END,
    _ms, _ms, _ms,
    CASE WHEN _ok THEN NULL ELSE _checked_at END,
    now()
  )
  ON CONFLICT (service_id, day) DO UPDATE SET
    total        = public.status_daily.total + 1,
    ok           = public.status_daily.ok   + CASE WHEN _ok       THEN 1 ELSE 0 END,
    fail         = public.status_daily.fail + CASE WHEN _ok       THEN 0 ELSE 1 END,
    slow         = public.status_daily.slow + CASE WHEN v_slow    THEN 1 ELSE 0 END,
    ms_min       = LEAST(public.status_daily.ms_min, _ms),
    ms_max       = GREATEST(public.status_daily.ms_max, _ms),
    ms_sum       = public.status_daily.ms_sum + _ms,
    last_fail_at = CASE WHEN _ok THEN public.status_daily.last_fail_at ELSE _checked_at END,
    updated_at   = now();
END;
$$;

-- Service role only — the edge function runs with this key.
REVOKE ALL ON FUNCTION public.record_status_check(text, boolean, integer, timestamptz) FROM public, anon, authenticated;

-- ── prune_status_history: drop buckets older than 90 days ─────────────────
CREATE OR REPLACE FUNCTION public.prune_status_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.status_daily WHERE day < (now() AT TIME ZONE 'UTC')::date - INTERVAL '90 days';
$$;

REVOKE ALL ON FUNCTION public.prune_status_history() FROM public, anon, authenticated;
\n-- === supabase/migrations/20260424120100_status_cron.sql ===
-- Schedule the status-probe edge function to run every 5 minutes so the
-- daily history is filled in continuously, even when nobody is on the
-- status page. Also schedule a nightly prune to drop buckets older than
-- 90 days.
--
-- ⚠️  Requires `pg_cron` and `pg_net` to be enabled on your Supabase project.
--     Both are first-party Supabase extensions and can be enabled in
--     Database → Extensions. If you can't enable them on your plan, skip
--     this migration and call the status-probe function from any external
--     scheduler instead (cron-job.org, GitHub Actions, etc).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Helper: read a setting with a default. We use Postgres GUCs so the
-- migration doesn't hardcode the project URL or service role key.
DO $$
DECLARE
  v_url   text := current_setting('app.settings.supabase_url', true);
  v_key   text := current_setting('app.settings.supabase_service_role_key', true);
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE NOTICE
      'Skipping status cron schedule: app.settings.supabase_url and app.settings.supabase_service_role_key must be set.';
    RAISE NOTICE
      'Run: ALTER DATABASE postgres SET app.settings.supabase_url = ''https://<project-ref>.supabase.co'';';
    RAISE NOTICE
      '     ALTER DATABASE postgres SET app.settings.supabase_service_role_key = ''<service-role-key>'';';
    RAISE NOTICE
      'Then re-run this migration (or schedule the cron jobs manually).';
    RETURN;
  END IF;

  -- Remove existing schedules with the same name (idempotent).
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname IN ('afuchat_status_probe', 'afuchat_status_prune');

  PERFORM cron.schedule(
    'afuchat_status_probe',
    '*/5 * * * *',
    format($cron$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body    := '{}'::jsonb
      );
    $cron$, v_url || '/functions/v1/status-probe', v_key)
  );

  PERFORM cron.schedule(
    'afuchat_status_prune',
    '15 3 * * *',
    'SELECT public.prune_status_history();'
  );
END $$;
\n-- === supabase/migrations/20260501071742_3a4edbb3-57e1-4af4-9d5e-0cd6dd9d7c33.sql ===
-- Custom-domain primary addresses should not count toward the platform (afuchat.com) cap.
-- Plan caps only apply to addresses on the shared platform domain.
CREATE OR REPLACE FUNCTION public.check_email_address_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  email_count INTEGER;
  user_plan TEXT;
  max_allowed INTEGER;
  v_owns_domain BOOLEAN;
BEGIN
  -- Aliases are unlimited for everyone.
  IF NEW.is_alias = true THEN
    RETURN NEW;
  END IF;

  user_plan := public.get_user_plan(NEW.user_id);

  -- Admins and Business get unlimited primary addresses everywhere.
  IF user_plan IN ('admin', 'business') THEN
    RETURN NEW;
  END IF;

  -- Addresses created on a verified custom domain that the user owns
  -- do NOT count against the platform-domain cap. They are governed by
  -- the user owning the domain (and require Pro+, enforced in the RPC).
  IF NEW.domain <> 'afuchat.com' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.custom_domains
       WHERE user_id = NEW.user_id
         AND domain = NEW.domain
         AND status = 'verified'
    ) INTO v_owns_domain;
    IF v_owns_domain THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Plan-based caps for primary addresses on the shared platform domain.
  IF user_plan = 'professional' THEN
    max_allowed := 3;
  ELSE
    max_allowed := 1; -- starter / free
  END IF;

  SELECT COUNT(*) INTO email_count
    FROM public.email_addresses
   WHERE user_id = NEW.user_id
     AND is_alias = false
     AND domain = 'afuchat.com';

  IF email_count >= max_allowed THEN
    RAISE EXCEPTION 'You have reached the address limit for the afuchat.com domain on your plan. Upgrade at /pricing or add an address on one of your verified custom domains.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;\n-- === supabase/migrations/20260502075614_d5f7be14-840c-4da1-a674-8d97c9098261.sql ===
ALTER TABLE public.custom_domains
  ADD COLUMN IF NOT EXISTS resend_domain_id text,
  ADD COLUMN IF NOT EXISTS dns_records jsonb;\n-- === supabase/migrations/20260506181522_9fc97e34-3063-4b0e-904d-41e0957cb715.sql ===

CREATE TABLE IF NOT EXISTS public.status_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('degraded','down')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  title text NOT NULL,
  summary text NOT NULL,
  body_open text NOT NULL,
  body_resolved text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_incidents_service_status ON public.status_incidents(service_id, status);
CREATE INDEX IF NOT EXISTS idx_status_incidents_opened_at ON public.status_incidents(opened_at DESC);

ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_incidents_public_read"
  ON public.status_incidents FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER status_incidents_set_updated_at
  BEFORE UPDATE ON public.status_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
\n-- === supabase/migrations/20260704084856_92656964-78d0-4464-a8ca-ffe01dbb226a.sql ===

-- 1) Recovery email pointer on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recovery_email_address_id uuid
  REFERENCES public.email_addresses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_recovery_email_address_id
  ON public.profiles(recovery_email_address_id)
  WHERE recovery_email_address_id IS NOT NULL;

-- 2) Password reset tokens (hash only, single-use, expiring)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  recovery_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON public.password_reset_tokens(expires_at);

-- Grants: locked down. Only service_role touches this table.
GRANT ALL ON public.password_reset_tokens TO service_role;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → totally invisible to clients.
-- (Edge functions use service_role and bypass RLS.)

-- 3) SECURITY DEFINER: check that an email address exists (any user's) — used at
-- signup to validate a chosen recovery target without leaking other data.
CREATE OR REPLACE FUNCTION public.lookup_recovery_address_id(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
    FROM public.email_addresses
   WHERE full_email = lower(trim(_email))
   LIMIT 1;
$$;

-- Anyone can call this (needed during signup pre-auth); it only returns the
-- address's internal id if it exists, nothing else.
GRANT EXECUTE ON FUNCTION public.lookup_recovery_address_id(text) TO anon, authenticated;

-- 4) SECURITY DEFINER: set the current user's recovery email by full address.
-- Validates that the address exists AND does not belong to the caller (must be
-- a different mailbox, otherwise recovery would be useless if they lost access).
CREATE OR REPLACE FUNCTION public.set_recovery_email(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_addr_id uuid;
  v_addr_owner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id, user_id
    INTO v_addr_id, v_addr_owner
    FROM public.email_addresses
   WHERE full_email = lower(trim(_email))
   LIMIT 1;

  IF v_addr_id IS NULL THEN
    RAISE EXCEPTION 'Recovery address does not exist on AfuChat' USING ERRCODE = 'check_violation';
  END IF;

  IF v_addr_owner = v_uid THEN
    RAISE EXCEPTION 'Recovery address must belong to a different mailbox than your own' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.profiles
     SET recovery_email_address_id = v_addr_id,
         updated_at = now()
   WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_recovery_email(text) TO authenticated;
\n-- === supabase/migrations/20260811165556_37bd8a41-81c3-4cf9-a2d4-1aa5a9441efe.sql ===
-- 1. Fixed search_path on remaining functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_custom_domain_updated_at() SET search_path = public;

-- 2. Revoke EXECUTE on internal/trigger functions from API roles
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_custom_domain_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_folders() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.detect_important_email() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_alias_target() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_alias_admin_only() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.check_email_address_limit() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_trash_emails() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.unsnooze_emails() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.lookup_recovery_address_id(text) FROM anon, authenticated;

-- 3. Admin + user-scoped RPCs: signed-in only, never anonymous
REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM anon;
REVOKE ALL ON FUNCTION public.admin_get_user_emails(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_toggle_user_ban(uuid, boolean, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_toggle_user_role(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.set_recovery_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.create_custom_domain_address(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_storage_quota_bytes(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_storage_used_bytes(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

-- 4. Avatars bucket: stop broad listing of all files
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Users can list their own avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. oauth_tokens: owner delete + constrain revoke updates
DROP POLICY IF EXISTS "Users can revoke their own tokens" ON public.oauth_tokens;
CREATE POLICY "Users can revoke their own tokens"
  ON public.oauth_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND revoked = true);

CREATE POLICY "Users can delete their own tokens"
  ON public.oauth_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own tokens" ON public.oauth_tokens;
CREATE POLICY "Users can view their own tokens"
  ON public.oauth_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, UPDATE, DELETE ON public.oauth_tokens TO authenticated;
GRANT ALL ON public.oauth_tokens TO service_role;

-- 6. oauth_authorization_codes: owner can consume/remove own codes
CREATE POLICY "Users can consume their own auth codes"
  ON public.oauth_authorization_codes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND used = true);

CREATE POLICY "Users can delete their own auth codes"
  ON public.oauth_authorization_codes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own auth codes" ON public.oauth_authorization_codes;
CREATE POLICY "Users can view their own auth codes"
  ON public.oauth_authorization_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own auth codes" ON public.oauth_authorization_codes;
CREATE POLICY "Users can create their own auth codes"
  ON public.oauth_authorization_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_authorization_codes TO authenticated;
GRANT ALL ON public.oauth_authorization_codes TO service_role;

-- 7. payment_transactions: admin visibility (covers guest rows with NULL user_id)
CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. user_roles: no write access for app roles at all
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
\n-- === supabase/migrations/20260811165621_bb8e3ee5-3540-4c78-96fe-4da2e8450071.sql ===
-- Remove the implicit "everyone" EXECUTE grant on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.create_default_folders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_alias_target() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_alias_admin_only() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_email_address_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.detect_important_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_trash_emails() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unsnooze_emails() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_recovery_address_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_storage_quota_bytes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_storage_used_bytes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_recovery_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_user_emails(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_toggle_user_ban(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_toggle_user_role(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_custom_domain_address(uuid, text) FROM PUBLIC;

-- Keep the app working: signed-in users need these RPCs
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_storage_quota_bytes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_storage_used_bytes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_recovery_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_recovery_address_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_custom_domain_address(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_ban(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_role(uuid, boolean) TO authenticated;

-- Signup needs the username availability check before sign-in
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;
\n-- === supabase/migrations/20260812075727_5580fd68-48b6-4d98-a1be-bc2d0cb0f12b.sql ===
ALTER TABLE public.custom_domains
  ADD COLUMN IF NOT EXISTS catch_all boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catch_all_address_id uuid REFERENCES public.email_addresses(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_domain_catch_all(_domain_id uuid, _enabled boolean, _address_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_status text;
  v_addr_owner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT user_id, status INTO v_owner, v_status
    FROM public.custom_domains WHERE id = _domain_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Domain not found';
  END IF;

  IF v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'You do not own this domain' USING ERRCODE = '42501';
  END IF;

  IF _enabled AND v_status <> 'verified' THEN
    RAISE EXCEPTION 'Verify the domain before enabling catch-all' USING ERRCODE = 'check_violation';
  END IF;

  IF _enabled THEN
    IF _address_id IS NULL THEN
      RAISE EXCEPTION 'Choose a mailbox to receive catch-all mail' USING ERRCODE = 'check_violation';
    END IF;
    SELECT user_id INTO v_addr_owner FROM public.email_addresses WHERE id = _address_id;
    IF v_addr_owner IS NULL OR v_addr_owner <> v_owner THEN
      RAISE EXCEPTION 'Catch-all mailbox must be one of your own addresses' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.custom_domains
     SET catch_all = _enabled,
         catch_all_address_id = CASE WHEN _enabled THEN _address_id ELSE NULL END,
         updated_at = now()
   WHERE id = _domain_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_domain_catch_all(uuid, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_domain_catch_all(uuid, boolean, uuid) TO authenticated;\n-- === supabase/migrations/20260813131210_492ff18b-c4a2-48ed-a788-98aba0878bda.sql ===
CREATE OR REPLACE FUNCTION public.keep_custom_domain_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'verified' AND NEW.status IS DISTINCT FROM 'verified' THEN
    NEW.status := 'verified';
    NEW.verified_at := COALESCE(OLD.verified_at, NEW.verified_at, now());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.keep_custom_domain_verified() FROM anon, authenticated;

DROP TRIGGER IF EXISTS keep_custom_domain_verified_trg ON public.custom_domains;
CREATE TRIGGER keep_custom_domain_verified_trg
BEFORE UPDATE ON public.custom_domains
FOR EACH ROW EXECUTE FUNCTION public.keep_custom_domain_verified();