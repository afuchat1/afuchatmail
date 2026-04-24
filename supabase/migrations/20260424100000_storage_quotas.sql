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
