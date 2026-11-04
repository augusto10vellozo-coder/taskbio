-- Returns one unit to the caller's daily counter when the paid AI call failed.
-- Without this, a technical error (invalid schema, provider outage, timeout)
-- burns the user's daily allowance even though nothing was delivered.

CREATE OR REPLACE FUNCTION public.refund_ai_quota(_feature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  remaining integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'unauthenticated');
  END IF;

  UPDATE public.ai_usage
     SET calls = calls - 1,
         updated_at = now()
   WHERE user_id = uid
     AND feature = _feature
     AND day = today
     AND calls > 0
   RETURNING calls INTO remaining;

  RETURN jsonb_build_object('refunded', remaining IS NOT NULL, 'used', remaining);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_ai_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_ai_quota(text) TO authenticated;

COMMENT ON FUNCTION public.refund_ai_quota(text) IS
  'Returns one daily AI unit to the caller when the paid call failed.';
