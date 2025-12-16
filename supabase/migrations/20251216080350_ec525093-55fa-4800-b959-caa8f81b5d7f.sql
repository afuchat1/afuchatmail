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
  EXECUTE FUNCTION public.handle_updated_at();