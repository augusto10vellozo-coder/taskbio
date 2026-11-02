-- All-time XP of the caller, used for the level. Excludes superseded legacy rows
-- and keeps the migration opening balance, so historical users do not lose standing.
CREATE OR REPLACE FUNCTION public.my_total_xp()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(points), 0)::integer
  FROM public.xp_events
  WHERE user_id = auth.uid() AND NOT legacy;
$$;
REVOKE ALL ON FUNCTION public.my_total_xp() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_total_xp() TO authenticated;

COMMENT ON FUNCTION public.my_total_xp() IS 'All-time XP of the caller for level progression.';
