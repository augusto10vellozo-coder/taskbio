CREATE OR REPLACE FUNCTION public.guard_study_daily_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind <> 'study' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('study:' || NEW.user_id::text || ':' || NEW.day::text, 0));
  IF EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = NEW.user_id AND kind = 'study' AND day = NEW.day AND id <> NEW.id) THEN RETURN NULL; END IF;
  NEW.points := 10;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_study_daily_xp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER study_daily_xp_guard BEFORE INSERT ON public.xp_events FOR EACH ROW EXECUTE FUNCTION public.guard_study_daily_xp();
CREATE OR REPLACE FUNCTION public.record_study_xp(_user_id uuid, _session_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE awarded integer; today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('study:' || _user_id::text || ':' || _date::text, 0));
  IF NOT _on THEN
    DELETE FROM public.xp_events WHERE user_id = _user_id AND kind = 'study' AND ref = 'study:' || _session_id AND day = _date;
    RETURN 0;
  END IF;
  IF _date <> today THEN RETURN 0; END IF;
  INSERT INTO public.xp_events(user_id, kind, ref, day, points) VALUES (_user_id, 'study', 'study:' || _session_id, _date, 10)
    ON CONFLICT (user_id, ref) DO NOTHING RETURNING points INTO awarded;
  RETURN COALESCE(awarded, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.record_study_xp(uuid, text, date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_study_xp(uuid, text, date, boolean) TO service_role;