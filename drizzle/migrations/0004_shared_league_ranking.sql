CREATE FUNCTION public.league_week_for(_start date, _user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH RECURSIVE members(uid) AS (
    SELECT _user_id WHERE _user_id IS NOT NULL AND (_user_id = auth.uid() OR auth.role() = 'service_role')
    UNION
    SELECT CASE WHEN f.requester = m.uid THEN f.addressee ELSE f.requester END
    FROM public.friendships f JOIN members m ON m.uid IN (f.requester, f.addressee)
    WHERE f.status = 'accepted'
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
  ORDER BY 5 DESC, 8 DESC, 9 ASC, 1 ASC;
$$;
REVOKE ALL ON FUNCTION public.league_week_for(date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.league_week_for(date, uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.league_week(_start date)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, week_xp integer, total_xp integer, today_xp integer, habit_days integer, first_mark_sec integer, habits integer, meals integer, workouts integer, streak integer, comeback boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT * FROM public.league_week_for(_start, auth.uid()); $$;
REVOKE ALL ON FUNCTION public.league_week(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.league_week(date) TO authenticated, service_role;