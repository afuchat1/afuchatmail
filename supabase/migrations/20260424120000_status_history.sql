-- Public, shared status history. Everyone reads the same numbers; only the
-- service role (via the status-probe edge function) writes to it.

-- ── status_latest: current snapshot per service ────────────────────────────
CREATE TABLE IF NOT EXISTS public.status_latest (
  service_id  text PRIMARY KEY,
  state       text NOT NULL,                       -- operational | degraded | down
  ms          integer NOT NULL DEFAULT 0,
  checked_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT status_latest_state_check
    CHECK (state IN ('operational','degraded','down'))
);

-- ── status_daily: rolled-up daily bucket per service (UTC days) ────────────
CREATE TABLE IF NOT EXISTS public.status_daily (
  service_id    text NOT NULL,
  day           date NOT NULL,                     -- UTC calendar day
  total         integer NOT NULL DEFAULT 0,
  ok            integer NOT NULL DEFAULT 0,
  fail          integer NOT NULL DEFAULT 0,
  slow          integer NOT NULL DEFAULT 0,        -- ok but >1500ms
  ms_min        integer NOT NULL DEFAULT 0,
  ms_max        integer NOT NULL DEFAULT 0,
  ms_sum        bigint  NOT NULL DEFAULT 0,
  last_fail_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, day)
);

CREATE INDEX IF NOT EXISTS status_daily_day_idx ON public.status_daily (day DESC);

-- ── RLS: everyone can read, nobody can write directly ─────────────────────
ALTER TABLE public.status_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_daily  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_latest_public_read" ON public.status_latest;
DROP POLICY IF EXISTS "status_daily_public_read"  ON public.status_daily;

CREATE POLICY "status_latest_public_read"
  ON public.status_latest FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "status_daily_public_read"
  ON public.status_daily FOR SELECT TO anon, authenticated
  USING (true);

-- (No INSERT/UPDATE/DELETE policies — only the service role can write.)

-- ── record_status_check: atomic upsert of a single probe result ───────────
CREATE OR REPLACE FUNCTION public.record_status_check(
  _service_id  text,
  _ok          boolean,
  _ms          integer,
  _checked_at  timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_state text;
  v_slow  boolean := _ok AND _ms > 1500;
  v_day   date    := (_checked_at AT TIME ZONE 'UTC')::date;
BEGIN
  v_state := CASE
    WHEN NOT _ok THEN 'down'
    WHEN v_slow  THEN 'degraded'
    ELSE 'operational'
  END;

  -- Upsert latest snapshot
  INSERT INTO public.status_latest (service_id, state, ms, checked_at)
  VALUES (_service_id, v_state, _ms, _checked_at)
  ON CONFLICT (service_id) DO UPDATE
    SET state      = EXCLUDED.state,
        ms         = EXCLUDED.ms,
        checked_at = EXCLUDED.checked_at;

  -- Upsert daily rollup
  INSERT INTO public.status_daily (
    service_id, day, total, ok, fail, slow,
    ms_min, ms_max, ms_sum, last_fail_at, updated_at
  )
  VALUES (
    _service_id, v_day,
    1,
    CASE WHEN _ok THEN 1 ELSE 0 END,
    CASE WHEN _ok THEN 0 ELSE 1 END,
    CASE WHEN v_slow THEN 1 ELSE 0 END,
    _ms, _ms, _ms,
    CASE WHEN _ok THEN NULL ELSE _checked_at END,
    now()
  )
  ON CONFLICT (service_id, day) DO UPDATE SET
    total        = public.status_daily.total + 1,
    ok           = public.status_daily.ok   + CASE WHEN _ok       THEN 1 ELSE 0 END,
    fail         = public.status_daily.fail + CASE WHEN _ok       THEN 0 ELSE 1 END,
    slow         = public.status_daily.slow + CASE WHEN v_slow    THEN 1 ELSE 0 END,
    ms_min       = LEAST(public.status_daily.ms_min, _ms),
    ms_max       = GREATEST(public.status_daily.ms_max, _ms),
    ms_sum       = public.status_daily.ms_sum + _ms,
    last_fail_at = CASE WHEN _ok THEN public.status_daily.last_fail_at ELSE _checked_at END,
    updated_at   = now();
END;
$$;

-- Service role only — the edge function runs with this key.
REVOKE ALL ON FUNCTION public.record_status_check(text, boolean, integer, timestamptz) FROM public, anon, authenticated;

-- ── prune_status_history: drop buckets older than 90 days ─────────────────
CREATE OR REPLACE FUNCTION public.prune_status_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.status_daily WHERE day < (now() AT TIME ZONE 'UTC')::date - INTERVAL '90 days';
$$;

REVOKE ALL ON FUNCTION public.prune_status_history() FROM public, anon, authenticated;
