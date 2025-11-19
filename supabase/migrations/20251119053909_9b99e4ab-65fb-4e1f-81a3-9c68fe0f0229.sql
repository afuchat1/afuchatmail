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
  EXECUTE FUNCTION public.check_alias_target();