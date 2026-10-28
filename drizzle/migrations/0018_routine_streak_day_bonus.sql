-- Routine streak: consecutive days (ending today, or yesterday if today has nothing done yet) with at least one completed planned block. No freezes.
CREATE OR REPLACE FUNCTION public.routine_streak(_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; n int := 0; c record;
BEGIN
  SELECT * INTO c FROM public.day_plan_counts(_user_id, d);
  IF c.done = 0 THEN d := d - 1; END IF;
  LOOP
    SELECT * INTO c FROM public.day_plan_counts(_user_id, d);
    EXIT WHEN c.done = 0 OR n >= 400;
    n := n + 1; d := d - 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.routine_streak(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.routine_streak(uuid) TO service_role;

-- Full-day bonus (+20, cap-exempt): granted at 100% of today's planned blocks, revoked when it drops below.
CREATE OR REPLACE FUNCTION public.sync_day_bonus(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; c record; ref text := 'bonus_dia_completo:' || t::text;
BEGIN
  SELECT * INTO c FROM public.day_plan_counts(_user_id, t);
  IF c.planned > 0 AND c.done >= c.planned THEN
    RETURN public.grant_xp(_user_id, 'bonus_dia_completo', ref, t, 20);
  END IF;
  RETURN -public.revoke_xp(_user_id, ref);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_day_bonus(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_day_bonus(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_data_sync_day_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.sync_day_bonus(NEW.user_id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.user_data_sync_day_bonus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS user_data_sync_day_bonus ON public.user_data;
CREATE TRIGGER user_data_sync_day_bonus AFTER INSERT OR UPDATE OF plan, settings ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.user_data_sync_day_bonus();

-- League: only members with planned blocks; % desc, then routine streak.
DROP FUNCTION IF EXISTS public.league_week(date);
DROP FUNCTION IF EXISTS public.league_week_for(date, uuid);
CREATE FUNCTION public.league_week_for(_start date, _user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean, week_pct numeric, streak_rotina integer)
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
  cur AS (SELECT DISTINCT ON (r.user_id) r.* FROM runs r, today t WHERE r.last_day >= t.d - 1 ORDER BY r.user_id, r.last_day DESC),
  pct AS (SELECT m.uid, public.week_completion(m.uid, _start) AS p FROM members m)
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
    pc.p,
    public.routine_streak(m.uid)
  FROM members m JOIN pct pc ON pc.uid = m.uid LEFT JOIN profiles p ON p.id = m.uid
  WHERE pc.p IS NOT NULL
  ORDER BY 15 DESC, 16 DESC, 1 ASC;
$$;
REVOKE ALL ON FUNCTION public.league_week_for(date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_week_for(date, uuid) TO service_role;
CREATE FUNCTION public.league_week(_start date)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean, week_pct numeric, streak_rotina integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT * FROM public.league_week_for(_start, auth.uid()); $$;
REVOKE ALL ON FUNCTION public.league_week(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.league_week(date) TO authenticated, service_role;

-- Weekly winner: highest whole %, tie broken by routine streak; full ties share the win.
CREATE OR REPLACE FUNCTION public.claim_league_awards()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  t date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  last_start date; n int; top record; mine record; won boolean := false;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  last_start := (t - EXTRACT(DOW FROM t)::int) - 7;
  IF NOT EXISTS (SELECT 1 FROM league_wins WHERE user_id = me AND week_start = last_start) THEN
    CREATE TEMP TABLE IF NOT EXISTS _lw ON COMMIT DROP AS SELECT * FROM league_week(last_start);
    SELECT COUNT(*) INTO n FROM _lw;
    SELECT round(week_pct * 100) AS p, streak_rotina AS s INTO top FROM _lw ORDER BY round(week_pct * 100) DESC, streak_rotina DESC LIMIT 1;
    SELECT round(week_pct * 100) AS p, streak_rotina AS s INTO mine FROM _lw WHERE user_id = me;
    IF n >= 2 AND top.p > 0 AND mine.p = top.p AND mine.s = top.s THEN
      INSERT INTO league_wins(user_id, week_start) VALUES (me, last_start) ON CONFLICT DO NOTHING;
      won := true;
    END IF;
    DROP TABLE IF EXISTS _lw;
  END IF;
  RETURN jsonb_build_object(
    'won', won, 'week_start', last_start, 'frozen_day', NULL,
    'wins', (SELECT COALESCE(jsonb_agg(week_start ORDER BY week_start), '[]'::jsonb) FROM league_wins WHERE user_id = me),
    'freeze_days', '[]'::jsonb
  );
END;
$$;