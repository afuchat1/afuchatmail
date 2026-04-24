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
