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
GRANT EXECUTE ON FUNCTION public.set_domain_catch_all(uuid, boolean, uuid) TO authenticated;