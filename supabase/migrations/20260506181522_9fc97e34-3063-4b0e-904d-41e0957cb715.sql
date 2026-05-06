
CREATE TABLE IF NOT EXISTS public.status_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('degraded','down')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  title text NOT NULL,
  summary text NOT NULL,
  body_open text NOT NULL,
  body_resolved text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_incidents_service_status ON public.status_incidents(service_id, status);
CREATE INDEX IF NOT EXISTS idx_status_incidents_opened_at ON public.status_incidents(opened_at DESC);

ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_incidents_public_read"
  ON public.status_incidents FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER status_incidents_set_updated_at
  BEFORE UPDATE ON public.status_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
