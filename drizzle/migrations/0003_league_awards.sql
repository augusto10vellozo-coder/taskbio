CREATE TABLE public.league_wins (user_id uuid NOT NULL, week_start date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, week_start));
GRANT SELECT ON public.league_wins TO authenticated;
GRANT ALL ON public.league_wins TO service_role;
ALTER TABLE public.league_wins ENABLE ROW LEVEL SECURITY;
CREATE POLICY league_wins_read_own ON public.league_wins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.streak_freezes (user_id uuid NOT NULL, day date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, day));
GRANT SELECT ON public.streak_freezes TO authenticated;
GRANT ALL ON public.streak_freezes TO service_role;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;
CREATE POLICY streak_freezes_read_own ON public.streak_freezes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP FUNCTION public.league_week(date);
CREATE FUNCTION public.league_week(_start date)
 RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH members AS (
    SELECT auth.uid() AS uid
    UNION SELECT CASE WHEN f.requester = auth.uid() THEN f.addressee ELSE f.requester END
    FROM friendships f WHERE f.status = 'accepted' AND auth.uid() IN (f.requester, f.addressee)
  ),
  today AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS d),
  ev AS (SELECT e.* FROM xp_events e JOIN members m ON m.uid = e.user_id),
  wk AS (SELECT * FROM ev WHERE day BETWEEN _start AND _start + 6),
  daily AS (SELECT wk.user_id, day, LEAST(100, SUM(points))::int AS pts FROM wk GROUP BY wk.user_id, day),
  firsts AS (
    SELECT wk.user_id, day, MIN(EXTRACT(EPOCH FROM ((created_at AT TIME ZONE 'America/Sao_Paulo')::time)))::int AS sec
    FROM wk WHERE kind = 'habit' GROUP BY wk.user_id, day
  ),
  active AS (
    SELECT DISTINCT ev.user_id, day FROM ev WHERE kind IN ('habit','block','meal','workout')
    UNION SELECT s.user_id, s.day FROM streak_freezes s JOIN members m ON m.uid = s.user_id
  ),
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
    COALESCE((SELECT c.first_day BETWEEN _start AND _start + 6 AND EXISTS (SELECT 1 FROM active a WHERE a.user_id = m.uid AND a.day < c.first_day) FROM cur c WHERE c.user_id = m.uid), false)
  FROM members m LEFT JOIN profiles p ON p.id = m.uid
  WHERE auth.uid() IS NOT NULL
  ORDER BY 5 DESC, 8 DESC, 9 ASC;
$$;

-- Records last week's win (if the caller was 1st among 2+ members) and applies one streak freeze for a single missed day.
CREATE FUNCTION public.claim_league_awards()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  t date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  last_start date;
  top record; n int; won boolean := false; frozen date := NULL; d date; avail int;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  last_start := (t - EXTRACT(DOW FROM t)::int) - 7;
  IF NOT EXISTS (SELECT 1 FROM league_wins WHERE user_id = me AND week_start = last_start) THEN
    SELECT COUNT(*) INTO n FROM league_week(last_start);
    SELECT * INTO top FROM league_week(last_start) LIMIT 1;
    IF n >= 2 AND top.user_id = me AND top.week_xp > 0 THEN
      INSERT INTO league_wins(user_id, week_start) VALUES (me, last_start) ON CONFLICT DO NOTHING;
      won := true;
    END IF;
  END IF;
  FOREACH d IN ARRAY ARRAY[t - 2, t - 1] LOOP
    SELECT (SELECT COUNT(*) FROM league_wins WHERE user_id = me) - (SELECT COUNT(*) FROM streak_freezes WHERE user_id = me) INTO avail;
    IF avail > 0
      AND NOT EXISTS (SELECT 1 FROM xp_events WHERE user_id = me AND day = d AND kind IN ('habit','block','meal','workout'))
      AND NOT EXISTS (SELECT 1 FROM streak_freezes WHERE user_id = me AND day = d)
      AND EXISTS (SELECT 1 FROM xp_events WHERE user_id = me AND day = d - 1 AND kind IN ('habit','block','meal','workout'))
      AND (d = t - 1 OR EXISTS (SELECT 1 FROM xp_events WHERE user_id = me AND day = d + 1 AND kind IN ('habit','block','meal','workout')))
    THEN
      INSERT INTO streak_freezes(user_id, day) VALUES (me, d);
      frozen := d;
    END IF;
  END LOOP;
  RETURN jsonb_build_object(
    'won', won, 'week_start', last_start, 'frozen_day', frozen,
    'wins', (SELECT COALESCE(jsonb_agg(week_start ORDER BY week_start), '[]'::jsonb) FROM league_wins WHERE user_id = me),
    'freeze_days', (SELECT COALESCE(jsonb_agg(day ORDER BY day), '[]'::jsonb) FROM streak_freezes WHERE user_id = me)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.claim_league_awards() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_league_awards() TO authenticated;