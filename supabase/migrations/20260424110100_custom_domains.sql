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
