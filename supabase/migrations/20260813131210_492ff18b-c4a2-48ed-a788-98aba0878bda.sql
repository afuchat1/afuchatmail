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