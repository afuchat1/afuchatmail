ALTER TABLE public.custom_domains
  ADD COLUMN IF NOT EXISTS resend_domain_id text,
  ADD COLUMN IF NOT EXISTS dns_records jsonb;