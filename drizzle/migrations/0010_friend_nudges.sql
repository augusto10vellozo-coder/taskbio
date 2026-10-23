CREATE TABLE public.nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender uuid NOT NULL,
  recipient uuid NOT NULL,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  CHECK (sender <> recipient),
  UNIQUE (sender, recipient, day)
);
GRANT SELECT, UPDATE ON public.nudges TO authenticated;
GRANT ALL ON public.nudges TO service_role;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY nudges_read_participants ON public.nudges FOR SELECT TO authenticated USING (auth.uid() IN (sender, recipient));
CREATE POLICY nudges_recipient_marks_seen ON public.nudges FOR UPDATE TO authenticated USING (auth.uid() = recipient) WITH CHECK (auth.uid() = recipient);

CREATE FUNCTION public.league_inactive(_start date)
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id FROM public.league_week(_start) m
  WHERE m.user_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM xp_events e WHERE e.user_id = m.user_id AND e.kind IN ('habit','meal','workout') AND e.created_at > now() - interval '48 hours');
$$;
REVOKE ALL ON FUNCTION public.league_inactive(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.league_inactive(date) TO authenticated;