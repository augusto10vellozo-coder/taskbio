ALTER TABLE public.xp_events DROP CONSTRAINT IF EXISTS xp_events_kind_check;
ALTER TABLE public.xp_events ADD CONSTRAINT xp_events_kind_check CHECK (kind IN ('habit','block','meal','workout','photo','bonus','reading','study','bill','bonus_dia_completo','saldo_inicial_migracao'));

CREATE OR REPLACE FUNCTION public.a_enforce_central_xp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'saldo_inicial_migracao' THEN RAISE EXCEPTION 'O saldo inicial de XP não pode ser revogado'; END IF;
    RETURN OLD;
  END IF;
  IF COALESCE(current_setting('taskbio.xp_grant', true), '') <> 'on' THEN
    RAISE EXCEPTION 'XP só pode ser gravado pela função central grant_xp (kind=%)', NEW.kind;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.a_enforce_central_xp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a_enforce_central_xp BEFORE INSERT OR UPDATE OR DELETE ON public.xp_events FOR EACH ROW EXECUTE FUNCTION public.a_enforce_central_xp();

CREATE OR REPLACE FUNCTION public.grant_xp(_user_id uuid, _kind text, _ref text, _day date, _points integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used integer; granted integer; cap constant integer := 150;
BEGIN
  IF _points IS NULL OR _points <= 0 THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('xp:' || _user_id::text || ':' || _day::text, 0));
  IF EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _user_id AND ref = _ref) THEN RETURN 0; END IF;
  IF _kind NOT IN ('bonus','bonus_dia_completo','saldo_inicial_migracao') THEN
    SELECT COALESCE(SUM(points), 0) INTO used FROM public.xp_events
      WHERE user_id = _user_id AND day = _day AND kind NOT IN ('bonus','bonus_dia_completo','saldo_inicial_migracao');
    IF used >= cap THEN RETURN 0; END IF;
    _points := LEAST(_points, cap - used);
  END IF;
  PERFORM set_config('taskbio.xp_grant', 'on', true);
  INSERT INTO public.xp_events(user_id, kind, ref, day, points) VALUES (_user_id, _kind, _ref, _day, _points)
    ON CONFLICT (user_id, ref) DO NOTHING RETURNING points INTO granted;
  PERFORM set_config('taskbio.xp_grant', 'off', true);
  RETURN COALESCE(granted, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_xp(uuid, text, text, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_xp(uuid, text, text, date, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_xp(_user_id uuid, _ref text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE removed integer;
BEGIN
  DELETE FROM public.xp_events WHERE user_id = _user_id AND ref = _ref AND kind <> 'saldo_inicial_migracao' RETURNING points INTO removed;
  RETURN COALESCE(removed, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_xp(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_xp(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_habit_xp(_user_id uuid, _habit_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h jsonb; settings_data jsonb; target integer; marks integer;
  week_start date := date_trunc('week', _date::timestamp)::date;
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  event_ref text := 'habit:' || _habit_id || ':' || _date::text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':habits', 0));
  IF NOT _on THEN PERFORM public.revoke_xp(_user_id, event_ref); RETURN 0; END IF;
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
  RETURN public.grant_xp(_user_id, 'habit', event_ref, today, 5);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_reading_xp(_user_id uuid, _session_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('reading:' || _user_id::text || ':' || _date::text, 0));
  IF NOT _on THEN PERFORM public.revoke_xp(_user_id, 'reading:' || _session_id); RETURN 0; END IF;
  IF _date <> today THEN RETURN 0; END IF;
  RETURN public.grant_xp(_user_id, 'reading', 'reading:' || _session_id, _date, 10);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_study_xp(_user_id uuid, _session_id text, _date date, _on boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('study:' || _user_id::text || ':' || _date::text, 0));
  IF NOT _on THEN PERFORM public.revoke_xp(_user_id, 'study:' || _session_id); RETURN 0; END IF;
  IF _date <> today THEN RETURN 0; END IF;
  RETURN public.grant_xp(_user_id, 'study', 'study:' || _session_id, _date, 10);
END;
$$;

CREATE TABLE public.xp_opening_balances (
  user_id uuid PRIMARY KEY,
  legacy_total integer NOT NULL,
  opening_points integer NOT NULL,
  migration_day date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  validated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.xp_opening_balances TO service_role;
ALTER TABLE public.xp_opening_balances ENABLE ROW LEVEL SECURITY;

INSERT INTO public.xp_opening_balances(user_id, legacy_total, opening_points)
  SELECT user_id, SUM(points)::int, SUM(points)::int FROM public.xp_events GROUP BY user_id;

DO $$
DECLARE old_total bigint; open_total bigint;
BEGIN
  SELECT COALESCE(SUM(points),0) INTO old_total FROM public.xp_events;
  SELECT COALESCE(SUM(opening_points),0) INTO open_total FROM public.xp_opening_balances;
  IF old_total <> open_total THEN
    RAISE EXCEPTION 'Saldo inicial divergente: antigo=% saldo=%', old_total, open_total;
  END IF;
  UPDATE public.xp_opening_balances SET validated = true;
END $$;