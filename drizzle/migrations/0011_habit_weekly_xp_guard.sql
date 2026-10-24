CREATE OR REPLACE FUNCTION public.record_habit_xp(_user_id uuid, _habit_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h jsonb;
  settings_data jsonb;
  target integer;
  marks integer;
  week_start date := date_trunc('week', _date::timestamp)::date;
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  event_ref text := 'habit:' || _habit_id || ':' || _date::text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':habits', 0));
  IF NOT _on THEN
    DELETE FROM public.xp_events WHERE user_id = _user_id AND ref = event_ref AND kind = 'habit';
    RETURN 0;
  END IF;
  IF _date <> today THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _user_id AND ref = event_ref) THEN RETURN 0; END IF;
  SELECT settings INTO settings_data FROM public.user_data WHERE user_id = _user_id;
  SELECT value INTO h FROM jsonb_array_elements(COALESCE(settings_data->'habits', '[]'::jsonb)) WHERE value->>'id' = _habit_id LIMIT 1;
  IF h IS NULL THEN RETURN 0; END IF;
  IF h->>'frequency' = 'weekly' THEN
    target := CASE WHEN h->>'weeklyTarget' ~ '^[1-6]$' THEN (h->>'weeklyTarget')::integer ELSE 3 END;
    SELECT count(DISTINCT d)::integer INTO marks FROM (
      SELECT e.day AS d FROM public.xp_events e WHERE e.user_id = _user_id AND e.kind = 'habit'
        AND e.ref = 'habit:' || _habit_id || ':' || e.day::text AND e.day BETWEEN week_start AND week_start + 6 AND e.day <> _date
      UNION
      SELECT k::date AS d FROM jsonb_each(COALESCE(settings_data->'habitLog', '{}'::jsonb)) AS logs(k, v)
        WHERE k ~ '^\d{4}-\d{2}-\d{2}$' AND k >= week_start::text AND k <= (week_start + 6)::text AND k <> _date::text AND v ? _habit_id
    ) AS marked;
    IF marks >= target THEN RETURN 0; END IF;
  END IF;
  INSERT INTO public.xp_events(user_id, kind, ref, day, points) VALUES (_user_id, 'habit', event_ref, today, 10) ON CONFLICT (user_id, ref) DO NOTHING;
  RETURN 10;
END;
$$;
REVOKE ALL ON FUNCTION public.record_habit_xp(uuid, text, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_habit_xp(uuid, text, date, boolean) TO service_role;