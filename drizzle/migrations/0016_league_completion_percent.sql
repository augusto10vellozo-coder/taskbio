-- 1) Retire legacy XP history: one non-revocable opening-balance event replaces it.
ALTER TABLE public.xp_events ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.xp_events.legacy IS 'true = pre-ledger history kept for idempotency only; never counted (replaced by saldo_inicial_migracao)';
SELECT set_config('taskbio.xp_grant', 'on', true);
UPDATE public.xp_events e SET legacy = true
  FROM public.xp_opening_balances o
  WHERE o.user_id = e.user_id AND e.created_at <= o.created_at AND e.kind <> 'saldo_inicial_migracao';
INSERT INTO public.xp_events(user_id, kind, ref, day, points)
  SELECT user_id, 'saldo_inicial_migracao', 'saldo_inicial_migracao', migration_day, legacy_total
  FROM public.xp_opening_balances WHERE validated AND legacy_total > 0
  ON CONFLICT (user_id, ref) DO NOTHING;
SELECT set_config('taskbio.xp_grant', 'off', true);
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM public.xp_opening_balances o
   WHERE (SELECT COALESCE(SUM(points),0) FROM public.xp_events e WHERE e.user_id = o.user_id AND NOT e.legacy) <> o.legacy_total;
  IF bad > 0 THEN RAISE EXCEPTION 'Saldo inicial divergente em % contas', bad; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.grant_xp(_user_id uuid, _kind text, _ref text, _day date, _points integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used integer; granted integer; cap constant integer := 150;
BEGIN
  IF _points IS NULL OR _points <= 0 THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('xp:' || _user_id::text || ':' || _day::text, 0));
  IF EXISTS (SELECT 1 FROM public.xp_events WHERE user_id = _user_id AND ref = _ref) THEN RETURN 0; END IF;
  IF _kind NOT IN ('bonus','bonus_dia_completo','saldo_inicial_migracao') THEN
    SELECT COALESCE(SUM(points), 0) INTO used FROM public.xp_events
      WHERE user_id = _user_id AND day = _day AND NOT legacy AND kind NOT IN ('bonus','bonus_dia_completo','saldo_inicial_migracao');
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

-- Legacy rows stay (they block re-earning the same ref) and are never deleted.
CREATE OR REPLACE FUNCTION public.revoke_xp(_user_id uuid, _ref text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE removed integer;
BEGIN
  DELETE FROM public.xp_events WHERE user_id = _user_id AND ref = _ref AND kind <> 'saldo_inicial_migracao' AND NOT legacy RETURNING points INTO removed;
  RETURN COALESCE(removed, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_xp(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_xp(uuid, text) TO service_role;

-- 2) Planned/done counts of one day, computed only from the stored account data and active modules.
CREATE OR REPLACE FUNCTION public.day_plan_counts(_user_id uuid, _day date, OUT planned integer, OUT done integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ud record; s jsonb; m jsonb; blocks jsonb; d text := _day::text;
  ws date := date_trunc('week', _day::timestamp)::date;
  h jsonb; tgt int; marks int; n int; k int;
BEGIN
  planned := 0; done := 0;
  SELECT plan, settings INTO ud FROM public.user_data WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;
  s := COALESCE(ud.settings, '{}'::jsonb); m := COALESCE(s->'modules', '{}'::jsonb);
  blocks := CASE WHEN jsonb_typeof(ud.plan->d) = 'array' THEN ud.plan->d ELSE '[]'::jsonb END;
  -- Meals (Alimentação, on by default)
  IF COALESCE((m->>'alimentacao')::boolean, true) THEN
    SELECT count(*), count(*) FILTER (WHERE CASE WHEN b ? 'plannedMeal' THEN b->'plannedMeal'->>'state' = 'consumida' ELSE (b->>'done')::boolean IS TRUE END)
      INTO n, k FROM jsonb_array_elements(blocks) b WHERE b->>'kind' = 'refeicao';
    planned := planned + n; done := done + k;
  END IF;
  -- Workouts (Treino, on by default)
  IF COALESCE((m->>'treino')::boolean, true) THEN
    SELECT count(*), count(*) FILTER (WHERE (b->>'done')::boolean IS TRUE)
      INTO n, k FROM jsonb_array_elements(blocks) b WHERE b->>'kind' = 'treino';
    planned := planned + n; done := done + k;
  END IF;
  -- Habits (on by default): daily always due; weekly due while the week's target is not reached
  IF COALESCE((m->>'habitos')::boolean, true) AND jsonb_typeof(s->'habits') = 'array' THEN
    FOR h IN SELECT value FROM jsonb_array_elements(s->'habits') LOOP
      CONTINUE WHEN left(COALESCE(h->>'createdAt', '0000'), 10) > d;
      IF COALESCE(s->'habitLog'->d, '[]'::jsonb) ? (h->>'id') THEN
        planned := planned + 1; done := done + 1;
      ELSIF h->>'frequency' = 'weekly' THEN
        tgt := CASE WHEN h->>'weeklyTarget' ~ '^[1-6]$' THEN (h->>'weeklyTarget')::int ELSE 3 END;
        SELECT count(*) INTO marks FROM jsonb_each(COALESCE(s->'habitLog', '{}'::jsonb)) l(lk, lv)
          WHERE lk >= ws::text AND lk < d AND lv ? (h->>'id');
        IF marks < tgt THEN planned := planned + 1; END IF;
      ELSE
        planned := planned + 1;
      END IF;
    END LOOP;
  END IF;
  -- Reading session when the module is on and there is a goal
  IF COALESCE((m->>'leitura')::boolean, false) AND COALESCE(NULLIF(s->'trackers'->>'readingGoal','')::numeric, 180) > 0 THEN
    planned := planned + 1;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s->'trackers'->'leitura', '[]'::jsonb)) x WHERE x->>'date' = d) THEN done := done + 1; END IF;
  END IF;
  -- Study session when the module is on and some subject has a daily goal
  IF COALESCE((m->>'estudos')::boolean, false) AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(s->'trackers'->'subjects', '[]'::jsonb)) x WHERE COALESCE(NULLIF(x->>'dailyGoalMin','')::numeric, 0) > 0) THEN
    planned := planned + 1;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s->'trackers'->'estudos', '[]'::jsonb)) x WHERE x->>'date' = d) THEN done := done + 1; END IF;
  END IF;
  -- Bills due that day (Finanças)
  IF COALESCE((m->>'financas')::boolean, false) THEN
    SELECT count(*), count(*) FILTER (WHERE (x->>'paid')::boolean IS TRUE)
      INTO n, k FROM jsonb_array_elements(COALESCE(s->'finance'->'bills', '[]'::jsonb)) x WHERE x->>'dueDate' = d;
    planned := planned + n; done := done + k;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.day_plan_counts(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.day_plan_counts(uuid, date) TO service_role;

-- Weekly score: mean of daily completion over days (up to today) that had something planned.
CREATE OR REPLACE FUNCTION public.week_completion(_user_id uuid, _start date)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT AVG(c.done::numeric / c.planned)
  FROM generate_series(_start, LEAST(_start + 6, (now() AT TIME ZONE 'America/Sao_Paulo')::date), interval '1 day') g(day),
       LATERAL public.day_plan_counts(_user_id, g.day::date) c
  WHERE c.planned > 0;
$$;
REVOKE ALL ON FUNCTION public.week_completion(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.week_completion(uuid, date) TO service_role;

-- 3) League by completion percentage; legacy XP never counts; no freezes.
DROP FUNCTION IF EXISTS public.league_week(date);
DROP FUNCTION IF EXISTS public.league_week_for(date, uuid);
CREATE FUNCTION public.league_week_for(_start date, _user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean, week_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE members(uid) AS (
    SELECT _user_id WHERE _user_id IS NOT NULL AND (_user_id = auth.uid() OR auth.role() = 'service_role')
    UNION
    SELECT CASE WHEN f.requester = m.uid THEN f.addressee ELSE f.requester END
    FROM public.friendships f JOIN members m ON m.uid IN (f.requester, f.addressee)
    WHERE f.status = 'accepted'
  ),
  today AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d),
  ev AS (SELECT e.* FROM xp_events e JOIN members m ON m.uid = e.user_id WHERE NOT e.legacy),
  allev AS (SELECT e.* FROM xp_events e JOIN members m ON m.uid = e.user_id),
  wk AS (SELECT * FROM ev WHERE day BETWEEN _start AND _start + 6 AND kind <> 'saldo_inicial_migracao'),
  daily AS (SELECT wk.user_id, day, SUM(points)::int AS pts FROM wk GROUP BY wk.user_id, day),
  firsts AS (
    SELECT wk.user_id, day, MIN(EXTRACT(EPOCH FROM ((created_at AT TIME ZONE 'America/Sao_Paulo')::time)))::int AS sec
    FROM wk WHERE kind = 'habit' GROUP BY wk.user_id, day
  ),
  active AS (SELECT DISTINCT allev.user_id, day FROM allev WHERE kind IN ('habit','block','meal','workout')),
  isl AS (SELECT a.user_id, day, day - (ROW_NUMBER() OVER (PARTITION BY a.user_id ORDER BY day))::int AS grp FROM active a),
  runs AS (SELECT isl.user_id, MIN(day) AS first_day, MAX(day) AS last_day, COUNT(*)::int AS len FROM isl GROUP BY isl.user_id, grp),
  cur AS (SELECT DISTINCT ON (r.user_id) r.* FROM runs r, today t WHERE r.last_day >= t.d - 1 ORDER BY r.user_id, r.last_day DESC)
  SELECT m.uid, COALESCE(p.display_name, ''), p.username, p.avatar_url,
    COALESCE((SELECT SUM(pts) FROM daily d WHERE d.user_id = m.uid), 0)::int,
    COALESCE((SELECT SUM(points) FROM ev WHERE ev.user_id = m.uid), 0)::int,
    COALESCE((SELECT pts FROM daily d, today t WHERE d.user_id = m.uid AND d.day = t.d), 0)::int,
    (SELECT COUNT(*) FROM firsts f WHERE f.user_id = m.uid)::int,
    COALESCE((SELECT AVG(sec) FROM firsts f WHERE f.user_id = m.uid), 86400)::int,
    (SELECT COUNT(*) FROM wk WHERE wk.user_id = m.uid AND kind = 'habit')::int,
    (SELECT COUNT(*) FROM wk WHERE wk.user_id = m.uid AND kind = 'meal')::int,
    (SELECT COUNT(*) FROM wk WHERE wk.user_id = m.uid AND kind = 'workout')::int,
    COALESCE((SELECT len FROM cur WHERE cur.user_id = m.uid), 0),
    COALESCE((SELECT c.first_day BETWEEN _start AND _start + 6 AND EXISTS (SELECT 1 FROM active a WHERE a.user_id = m.uid AND a.day < c.first_day) FROM cur c WHERE c.user_id = m.uid), false),
    public.week_completion(m.uid, _start)
  FROM members m LEFT JOIN profiles p ON p.id = m.uid
  ORDER BY 15 DESC NULLS LAST, 1 ASC;
$$;
REVOKE ALL ON FUNCTION public.league_week_for(date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_week_for(date, uuid) TO service_role;
CREATE FUNCTION public.league_week(_start date)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean, week_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT * FROM public.league_week_for(_start, auth.uid()); $$;
REVOKE ALL ON FUNCTION public.league_week(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.league_week(date) TO authenticated, service_role;

-- Weekly winner(s): highest completion average (ties share the win); no streak freezes from the league.
CREATE OR REPLACE FUNCTION public.claim_league_awards()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  t date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  last_start date; n int; best numeric; mine numeric; won boolean := false;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  last_start := (t - EXTRACT(DOW FROM t)::int) - 7;
  IF NOT EXISTS (SELECT 1 FROM league_wins WHERE user_id = me AND week_start = last_start) THEN
    SELECT COUNT(*), MAX(week_pct), MAX(week_pct) FILTER (WHERE user_id = me) INTO n, best, mine FROM league_week(last_start);
    IF n >= 2 AND best > 0 AND mine = best THEN
      INSERT INTO league_wins(user_id, week_start) VALUES (me, last_start) ON CONFLICT DO NOTHING;
      won := true;
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'won', won, 'week_start', last_start, 'frozen_day', NULL,
    'wins', (SELECT COALESCE(jsonb_agg(week_start ORDER BY week_start), '[]'::jsonb) FROM league_wins WHERE user_id = me),
    'freeze_days', '[]'::jsonb
  );
END;
$$;