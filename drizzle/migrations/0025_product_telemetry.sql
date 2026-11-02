-- Minimal product telemetry: one row per user, event and day. No content, no health data.
CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('day_active','onboarding_done','week_example_used','workout_imported','first_block_done')),
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event, day)
);

CREATE INDEX IF NOT EXISTS product_events_day_idx ON public.product_events(day);
CREATE INDEX IF NOT EXISTS product_events_user_idx ON public.product_events(user_id, day);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_events_insert_own ON public.product_events;
CREATE POLICY product_events_insert_own ON public.product_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS product_events_admin_read ON public.product_events;
CREATE POLICY product_events_admin_read ON public.product_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, SELECT ON public.product_events TO authenticated;

-- Activation: distinct users per event.
CREATE OR REPLACE FUNCTION public.product_activation()
RETURNS TABLE(event text, users bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY
    SELECT e.event, COUNT(DISTINCT e.user_id)::bigint
    FROM public.product_events e
    GROUP BY e.event
    ORDER BY 1;
END;
$$;
REVOKE ALL ON FUNCTION public.product_activation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_activation() TO authenticated;

-- Retention by first-seen cohort: share of users active 1 and 7 days later.
CREATE OR REPLACE FUNCTION public.product_retention(_days integer DEFAULT 30)
RETURNS TABLE(cohort_day date, cohort_size bigint, d1 bigint, d7 bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY
  WITH firsts AS (
    SELECT e.user_id, MIN(e.day) AS first_day
    FROM public.product_events e
    GROUP BY e.user_id
  ),
  active AS (
    SELECT e.user_id, e.day FROM public.product_events e WHERE e.event = 'day_active'
  )
  SELECT f.first_day,
         COUNT(*)::bigint,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM active a WHERE a.user_id = f.user_id AND a.day = f.first_day + 1
         ))::bigint,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM active a WHERE a.user_id = f.user_id AND a.day = f.first_day + 7
         ))::bigint
  FROM firsts f
  WHERE f.first_day >= (now() AT TIME ZONE 'America/Sao_Paulo')::date - GREATEST(_days, 1)
  GROUP BY f.first_day
  ORDER BY f.first_day;
END;
$$;
REVOKE ALL ON FUNCTION public.product_retention(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_retention(integer) TO authenticated;

COMMENT ON TABLE public.product_events IS 'Anonymous product telemetry: event name and day per user. Never stores health or content data.';
