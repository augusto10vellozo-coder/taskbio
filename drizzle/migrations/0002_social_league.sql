ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text DEFAULT encode(extensions.gen_random_bytes(5), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_key ON public.profiles (invite_code);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,20}$');

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL,
  addressee uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester <> addressee)
);
CREATE UNIQUE INDEX friendships_pair_key ON public.friendships (LEAST(requester, addressee), GREATEST(requester, addressee));
GRANT SELECT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY friendships_read_participants ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester, addressee));
CREATE POLICY friendships_addressee_responds ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = addressee AND status = 'pending') WITH CHECK (auth.uid() = addressee AND status IN ('accepted','declined'));
CREATE POLICY friendships_participants_remove ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (requester, addressee));

CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('habit','block','meal','workout','photo')),
  ref text NOT NULL,
  day date NOT NULL,
  points smallint NOT NULL,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ref)
);
CREATE INDEX xp_events_user_day ON public.xp_events (user_id, day);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_read_own ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.league_week(_start date)
RETURNS TABLE (user_id uuid, display_name text, username text, avatar_url text, week_xp int, total_xp int, today_xp int, habit_days int, first_mark_sec int, habits int, meals int, workouts int, streak int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  active AS (SELECT DISTINCT ev.user_id, day FROM ev WHERE kind IN ('habit','block','meal','workout')),
  isl AS (SELECT a.user_id, day, day - (ROW_NUMBER() OVER (PARTITION BY a.user_id ORDER BY day))::int AS grp FROM active a),
  runs AS (SELECT isl.user_id, MAX(day) AS last_day, COUNT(*)::int AS len FROM isl GROUP BY isl.user_id, grp)
  SELECT m.uid, COALESCE(p.display_name, ''), p.username, p.avatar_url,
    COALESCE((SELECT SUM(pts) FROM daily d WHERE d.user_id = m.uid), 0)::int,
    COALESCE((SELECT SUM(points) FROM ev WHERE ev.user_id = m.uid), 0)::int,
    COALESCE((SELECT pts FROM daily d, today t WHERE d.user_id = m.uid AND d.day = t.d), 0)::int,
    (SELECT COUNT(*) FROM firsts f WHERE f.user_id = m.uid)::int,
    COALESCE((SELECT AVG(sec) FROM firsts f WHERE f.user_id = m.uid), 86400)::int,
    (SELECT COUNT(*) FROM wk WHERE wk.user_id = m.uid AND kind = 'habit')::int,
    (SELECT COUNT(*) FROM wk WHERE wk.user_id = m.uid AND kind = 'meal')::int,
    (SELECT COUNT(*) FROM wk WHERE wk.user_id = m.uid AND kind = 'workout')::int,
    COALESCE((SELECT len FROM runs r, today t WHERE r.user_id = m.uid AND r.last_day >= t.d - 1 ORDER BY r.last_day DESC LIMIT 1), 0)
  FROM members m LEFT JOIN profiles p ON p.id = m.uid
  WHERE auth.uid() IS NOT NULL
  ORDER BY 5 DESC, 8 DESC, 9 ASC;
$$;
REVOKE ALL ON FUNCTION public.league_week(date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.league_week(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_profiles(_q text)
RETURNS TABLE (id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url FROM profiles p
  WHERE auth.uid() IS NOT NULL AND length(_q) >= 3 AND p.id <> auth.uid()
    AND p.username ILIKE replace(replace(lower(_q), '%', ''), '_', '\_') || '%'
  ORDER BY p.username LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.search_profiles(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_friend_requests()
RETURNS TABLE (id uuid, requester uuid, display_name text, username text, avatar_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.requester, p.display_name, p.username, p.avatar_url, f.created_at
  FROM friendships f LEFT JOIN profiles p ON p.id = f.requester
  WHERE f.addressee = auth.uid() AND f.status = 'pending' ORDER BY f.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.my_friend_requests() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_friend_requests() TO authenticated;

CREATE POLICY xp_photos_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'xp-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY xp_photos_read_own ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'xp-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY xp_photos_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'xp-photos' AND (storage.foldername(name))[1] = auth.uid()::text);