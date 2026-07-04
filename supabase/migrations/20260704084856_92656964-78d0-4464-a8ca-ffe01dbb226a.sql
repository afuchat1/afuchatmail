
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
