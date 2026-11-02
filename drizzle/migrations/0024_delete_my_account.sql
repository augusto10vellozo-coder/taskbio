-- Full account deletion. Until now only auth.users was removed, leaving routine,
-- health, finance, XP and photos behind. This deletes every personal row first and
-- then the login itself.

-- Allow a purge to remove XP rows, including the non-revocable opening balance.
-- Normal writes and revokes keep the original guard.
CREATE OR REPLACE FUNCTION public.a_enforce_central_xp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(current_setting('taskbio.xp_purge', true), '') = 'on' THEN RETURN OLD; END IF;
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

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  my_email text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado' USING ERRCODE = '28000'; END IF;
  SELECT email INTO my_email FROM auth.users WHERE id = me;

  PERFORM set_config('taskbio.xp_purge', 'on', true);
  DELETE FROM public.xp_events WHERE user_id = me;
  PERFORM set_config('taskbio.xp_purge', 'off', true);

  DELETE FROM public.push_delivery_attempts WHERE user_id = me;
  DELETE FROM public.push_delivery_jobs WHERE user_id = me;
  DELETE FROM public.push_sent WHERE user_id = me;
  DELETE FROM public.push_subscriptions WHERE user_id = me;

  DELETE FROM public.habit_freeze_events WHERE user_id = me;
  DELETE FROM public.habit_freeze_completions WHERE user_id = me;
  DELETE FROM public.habit_freeze_accounts WHERE user_id = me;
  DELETE FROM public.xp_opening_balances WHERE user_id = me;
  DELETE FROM public.league_wins WHERE user_id = me;
  DELETE FROM public.league_positions WHERE user_id = me;
  DELETE FROM public.streak_freezes WHERE user_id = me;

  DELETE FROM public.nudges WHERE sender = me OR recipient = me;
  DELETE FROM public.friendships WHERE requester = me OR addressee = me;

  DELETE FROM public.ai_usage WHERE user_id = me;
  DELETE FROM public.content_reviews WHERE created_by = me;
  DELETE FROM public.progress_entries WHERE user_id = me;
  DELETE FROM public.user_data WHERE user_id = me;

  DELETE FROM public.professional_clients
    WHERE professional_id = me OR client_id = me
       OR (my_email IS NOT NULL AND lower(invite_email) = lower(my_email));

  DELETE FROM public.profiles WHERE id = me;
  DELETE FROM public.user_roles WHERE user_id = me;

  -- As fotos do Storage são apagadas pela API antes desta chamada: o Supabase
  -- bloqueia exclusão direta em storage.objects por gatilho de proteção.
  DELETE FROM auth.users WHERE id = me;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account() IS 'Deletes every personal row and the login for the caller. Required by the privacy policy.';
