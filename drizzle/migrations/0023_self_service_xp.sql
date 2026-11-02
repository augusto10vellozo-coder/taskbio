-- XP/streak helpers that act only on the caller (auth.uid()).
-- They replace the service-role client in server functions: identity comes from the
-- verified session, and the allowed points per kind are decided here, never by the browser.

CREATE OR REPLACE FUNCTION public.award_my_xp(_kind text, _ref text, _day date, _points integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  expected integer := CASE _kind
    WHEN 'block' THEN 5
    WHEN 'meal' THEN 5
    WHEN 'workout' THEN 15
    WHEN 'photo' THEN 5
    WHEN 'bill' THEN 5
    ELSE 0 END;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  IF expected = 0 OR _points IS DISTINCT FROM expected THEN RETURN 0; END IF;
  IF _day IS DISTINCT FROM today THEN RETURN 0; END IF;
  RETURN public.grant_xp(me, _kind, _ref, _day, expected);
END;
$$;
REVOKE ALL ON FUNCTION public.award_my_xp(text, text, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_my_xp(text, text, date, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_my_xp(_ref text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  RETURN public.revoke_xp(me, _ref);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_my_xp(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_my_xp(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_my_habit_xp(_habit_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  RETURN public.record_habit_xp(me, _habit_id, _date, _on);
END;
$$;
REVOKE ALL ON FUNCTION public.record_my_habit_xp(text, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_habit_xp(text, date, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_my_reading_xp(_session_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  RETURN public.record_reading_xp(me, _session_id, _date, _on);
END;
$$;
REVOKE ALL ON FUNCTION public.record_my_reading_xp(text, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_reading_xp(text, date, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_my_study_xp(_session_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  RETURN public.record_study_xp(me, _session_id, _date, _on);
END;
$$;
REVOKE ALL ON FUNCTION public.record_my_study_xp(text, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_study_xp(text, date, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.routine_streak_me()
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  RETURN public.routine_streak(me);
END;
$$;
REVOKE ALL ON FUNCTION public.routine_streak_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.routine_streak_me() TO authenticated;

-- Close the inherited PUBLIC grant on the internal recorders: they accept an explicit
-- user id, so they must stay service-role only. The *_my_ wrappers above are the
-- authenticated entry point and always pass auth.uid().
REVOKE ALL ON FUNCTION public.record_habit_xp(uuid, text, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_habit_xp(uuid, text, date, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.record_reading_xp(uuid, text, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_reading_xp(uuid, text, date, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.record_study_xp(uuid, text, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_study_xp(uuid, text, date, boolean) TO service_role;
