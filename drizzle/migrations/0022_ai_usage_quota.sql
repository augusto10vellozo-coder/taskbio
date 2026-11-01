-- Per-user daily AI usage. The client can never write here: only consume_ai_quota does.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL,
  feature text NOT NULL,
  day date NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  input_chars bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, day)
);

CREATE INDEX IF NOT EXISTS ai_usage_day_idx ON public.ai_usage(day);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_read_own ON public.ai_usage;
CREATE POLICY ai_usage_read_own ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.ai_usage TO authenticated;

-- Atomically consumes one unit for the feature and returns whether it is allowed.
-- The row lock on the UPDATE makes concurrent calls safe; over-limit calls are reverted.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  _feature text,
  _chars integer,
  _daily_limit integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  safe_chars integer := GREATEST(COALESCE(_chars, 0), 0);
  used integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;
  IF _daily_limit IS NULL OR _daily_limit < 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_limit');
  END IF;

  INSERT INTO public.ai_usage (user_id, feature, day, calls, input_chars)
    VALUES (uid, _feature, today, 0, 0)
    ON CONFLICT (user_id, feature, day) DO NOTHING;

  UPDATE public.ai_usage
     SET calls = calls + 1,
         input_chars = input_chars + safe_chars,
         updated_at = now()
   WHERE user_id = uid AND feature = _feature AND day = today
   RETURNING calls INTO used;

  IF used > _daily_limit THEN
    UPDATE public.ai_usage
       SET calls = calls - 1,
           input_chars = GREATEST(input_chars - safe_chars, 0),
           updated_at = now()
     WHERE user_id = uid AND feature = _feature AND day = today;
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota', 'used', used - 1, 'limit', _daily_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', used, 'limit', _daily_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(text, integer, integer) TO authenticated;

COMMENT ON TABLE public.ai_usage IS 'Daily AI call counter per user/feature. Written only by consume_ai_quota.';
