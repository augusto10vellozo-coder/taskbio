-- Owner-only routine summary for the Progress screen. 7-day mode reuses week_completion (same number as the league).
CREATE OR REPLACE FUNCTION public.routine_progress(_start date, _end date, _league_week boolean DEFAULT false)
RETURNS TABLE(pct numeric, done integer, planned integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  t AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d),
  days AS (
    SELECT c.planned, c.done FROM me, t,
      generate_series(_start, LEAST(_end, t.d), interval '1 day') g(day),
      LATERAL public.day_plan_counts(me.uid, g.day::date) c
    WHERE me.uid IS NOT NULL AND _end - _start <= 120
  )
  SELECT CASE WHEN _league_week THEN public.week_completion((SELECT uid FROM me), _start)
              ELSE (SELECT AVG(done::numeric / planned) FROM days WHERE planned > 0) END,
         COALESCE((SELECT SUM(done) FROM days WHERE planned > 0), 0)::int,
         COALESCE((SELECT SUM(planned) FROM days), 0)::int
  WHERE (SELECT uid FROM me) IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.routine_progress(date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.routine_progress(date, date, boolean) TO authenticated, service_role;