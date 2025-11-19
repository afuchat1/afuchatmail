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
ON CONFLICT DO NOTHING;