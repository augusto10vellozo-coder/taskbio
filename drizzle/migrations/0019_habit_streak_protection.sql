CREATE TABLE public.habit_freeze_accounts (user_id uuid PRIMARY KEY, started_day date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date), processed_day date, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.habit_freeze_accounts TO authenticated; GRANT ALL ON public.habit_freeze_accounts TO service_role;
ALTER TABLE public.habit_freeze_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_freeze_account ON public.habit_freeze_accounts FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.habit_freeze_completions (user_id uuid NOT NULL, habit_id text NOT NULL, day date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,habit_id,day));
GRANT SELECT ON public.habit_freeze_completions TO authenticated; GRANT ALL ON public.habit_freeze_completions TO service_role;
ALTER TABLE public.habit_freeze_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_freeze_completions ON public.habit_freeze_completions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.habit_freeze_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, habit_id text, day date NOT NULL, kind text NOT NULL CHECK(kind IN ('gain','use','refund','break')), delta integer NOT NULL CHECK(delta BETWEEN -1 AND 1), reason text NOT NULL, event_key text NOT NULL, streak integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), seen_at timestamptz, UNIQUE(user_id,event_key));
GRANT SELECT ON public.habit_freeze_events TO authenticated; GRANT ALL ON public.habit_freeze_events TO service_role;
ALTER TABLE public.habit_freeze_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_freeze_events ON public.habit_freeze_events FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX habit_freeze_events_owner ON public.habit_freeze_events(user_id,day);
CREATE FUNCTION public.habit_freeze_balance(_user uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT COALESCE(sum(delta),0)::integer FROM public.habit_freeze_events WHERE user_id=_user $$;
REVOKE ALL ON FUNCTION public.habit_freeze_balance(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.habit_freeze_balance(uuid) TO service_role;
CREATE FUNCTION public.habit_protected_day(_user uuid,_habit text,_day date,_log jsonb) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT COALESCE(_log->_day::text,'[]'::jsonb) ? _habit OR EXISTS(SELECT 1 FROM public.habit_freeze_events u WHERE u.user_id=_user AND u.habit_id=_habit AND u.day=_day AND u.kind='use' AND NOT EXISTS(SELECT 1 FROM public.habit_freeze_events r WHERE r.user_id=u.user_id AND r.event_key='refund:'||u.id::text)) $$;
REVOKE ALL ON FUNCTION public.habit_protected_day(uuid,text,date,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.habit_protected_streak(_user uuid,_h jsonb,_log jsonb,_day date) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE d date:=_day; n integer:=0; marks integer; target integer; since_day date:=GREATEST(left(_h->>'createdAt',10)::date,COALESCE(NULLIF(_h->>'frequencySince','')::date,'0001-01-01'::date));
BEGIN
 IF _h->>'frequency'='weekly' THEN
  d:=date_trunc('week',d::timestamp)::date; target:=LEAST(6,GREATEST(1,COALESCE((_h->>'weeklyTarget')::integer,3)));
  LOOP
   SELECT count(*) INTO marks FROM generate_series(d::timestamp,(d+6)::timestamp,'1 day') x WHERE public.habit_protected_day(_user,_h->>'id',x::date,_log);
   IF marks<target THEN IF n=0 AND d=date_trunc('week',_day::timestamp)::date THEN d:=d-7; ELSE EXIT; END IF;
   ELSE n:=n+1; d:=d-7; END IF;
   EXIT WHEN d+6<since_day OR n>=520;
  END LOOP;
 ELSE
  IF NOT public.habit_protected_day(_user,_h->>'id',d,_log) THEN d:=d-1; END IF;
  WHILE d>=since_day AND public.habit_protected_day(_user,_h->>'id',d,_log) AND n<36500 LOOP n:=n+1; d:=d-1; END LOOP;
 END IF; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.habit_protected_streak(uuid,jsonb,jsonb,date) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.process_habit_freezes(_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; logs jsonb; h jsonb; a record; r record; d date; today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date; total integer; bal integer; added integer; target integer; marks integer; seq integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('habit-freezes:'||_user::text,0));
 SELECT settings INTO s FROM public.user_data WHERE user_id=_user; IF NOT FOUND THEN RETURN; END IF;
 logs:=COALESCE(s->'habitLog','{}'::jsonb);
 INSERT INTO public.habit_freeze_accounts(user_id) VALUES(_user) ON CONFLICT DO NOTHING;
 SELECT * INTO a FROM public.habit_freeze_accounts WHERE user_id=_user FOR UPDATE;
 FOR r IN SELECT u.* FROM public.habit_freeze_events u WHERE u.user_id=_user AND u.kind='use' AND COALESCE(logs->u.day::text,'[]'::jsonb) ? u.habit_id AND NOT EXISTS(SELECT 1 FROM public.habit_freeze_events f WHERE f.user_id=_user AND f.event_key='refund:'||u.id::text) ORDER BY u.created_at,u.id LOOP
  bal:=public.habit_freeze_balance(_user);
  INSERT INTO public.habit_freeze_events(user_id,habit_id,day,kind,delta,reason,event_key) VALUES(_user,r.habit_id,r.day,'refund',CASE WHEN bal<3 THEN 1 ELSE 0 END,'Conclusão retroativa','refund:'||r.id::text);
  UPDATE public.habit_freeze_events SET seen_at=COALESCE(seen_at,now()) WHERE id=r.id;
 END LOOP;
 -- Unique lifetime completions prevent undo/recheck farming. Legacy marks contribute, but legacy gaps never spend protection.
 FOR r IN SELECT l.k::date AS day,h0->>'id' AS hid FROM jsonb_each(logs) l(k,v) CROSS JOIN jsonb_array_elements(COALESCE(s->'habits','[]'::jsonb)) h0 WHERE l.k ~ '^\d{4}-\d{2}-\d{2}$' AND l.k<=today::text AND l.v ? (h0->>'id') AND l.k>=left(h0->>'createdAt',10) ORDER BY l.k,h0->>'id' LOOP
  INSERT INTO public.habit_freeze_completions(user_id,habit_id,day) VALUES(_user,r.hid,r.day) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS added=ROW_COUNT;
  IF added=1 THEN
   SELECT count(*) INTO total FROM public.habit_freeze_completions WHERE user_id=_user;
   IF total%10=0 THEN
    bal:=public.habit_freeze_balance(_user);
    INSERT INTO public.habit_freeze_events(user_id,day,kind,delta,reason,event_key) VALUES(_user,today,'gain',CASE WHEN bal<3 THEN 1 ELSE 0 END,'10 hábitos concluídos','gain:'||total::text);
   END IF;
  END IF;
 END LOOP;
 d:=COALESCE(a.processed_day+1,a.started_day);
 WHILE d<today LOOP
  IF COALESCE((s->'modules'->>'habitos')::boolean,true) THEN
   FOR h IN SELECT value FROM jsonb_array_elements(COALESCE(s->'habits','[]'::jsonb)) ORDER BY value->>'createdAt',value->>'id' LOOP
    CONTINUE WHEN left(h->>'createdAt',10)>d::text OR COALESCE(logs->d::text,'[]'::jsonb) ? (h->>'id');
    IF h->>'frequency'='weekly' THEN
     target:=LEAST(6,GREATEST(1,COALESCE((h->>'weeklyTarget')::integer,3)));
     SELECT count(*) INTO marks FROM jsonb_each(logs) l(k,v) WHERE k>=date_trunc('week',d::timestamp)::date::text AND k<d::text AND v ? (h->>'id');
     CONTINUE WHEN marks>=target;
    END IF;
    bal:=public.habit_freeze_balance(_user); seq:=public.habit_protected_streak(_user,h,logs,d);
    IF bal>0 THEN
     INSERT INTO public.habit_freeze_events(user_id,habit_id,day,kind,delta,reason,event_key,streak) VALUES(_user,h->>'id',d,'use',-1,'Proteção de sequência','use:'||(h->>'id')||':'||d::text,seq) ON CONFLICT DO NOTHING;
    ELSIF seq>0 THEN
     INSERT INTO public.habit_freeze_events(user_id,habit_id,day,kind,delta,reason,event_key,streak) VALUES(_user,h->>'id',d,'break',0,'Sequência encerrada','break:'||(h->>'id')||':'||d::text,seq) ON CONFLICT DO NOTHING;
    END IF;
   END LOOP;
  END IF;
  UPDATE public.habit_freeze_accounts SET processed_day=d WHERE user_id=_user; d:=d+1;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.process_habit_freezes(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.process_habit_freezes(uuid) TO service_role;
CREATE FUNCTION public.sync_habit_freezes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.process_habit_freezes(NEW.user_id); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.sync_habit_freezes() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_habit_freezes AFTER INSERT OR UPDATE OF settings ON public.user_data FOR EACH ROW EXECUTE FUNCTION public.sync_habit_freezes();
CREATE FUNCTION public.habit_freeze_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me uuid:=auth.uid(); result jsonb;
BEGIN
 IF me IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF; PERFORM public.process_habit_freezes(me);
 SELECT jsonb_build_object('balance',public.habit_freeze_balance(me),'progress',(SELECT count(*)%10 FROM public.habit_freeze_completions WHERE user_id=me),'frozen',COALESCE((SELECT jsonb_agg(jsonb_build_object('habitId',u.habit_id,'day',u.day)) FROM public.habit_freeze_events u WHERE u.user_id=me AND u.kind='use' AND NOT EXISTS(SELECT 1 FROM public.habit_freeze_events f WHERE f.user_id=me AND f.event_key='refund:'||u.id::text)),'[]'::jsonb),'notices',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'kind',kind,'streak',streak)) FROM public.habit_freeze_events WHERE user_id=me AND kind IN ('use','break') AND seen_at IS NULL),'[]'::jsonb)) INTO result; RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.habit_freeze_state() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.habit_freeze_state() TO authenticated;
CREATE FUNCTION public.ack_habit_freezes(_ids uuid[]) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.habit_freeze_events SET seen_at=now() WHERE user_id=auth.uid() AND id=ANY(_ids) AND seen_at IS NULL $$;
REVOKE ALL ON FUNCTION public.ack_habit_freezes(uuid[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.ack_habit_freezes(uuid[]) TO authenticated;
CREATE FUNCTION public.close_habit_freeze_days() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE u uuid; BEGIN FOR u IN SELECT user_id FROM public.user_data ORDER BY user_id LOOP PERFORM public.process_habit_freezes(u); END LOOP; END $$;
REVOKE ALL ON FUNCTION public.close_habit_freeze_days() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.close_habit_freeze_days() TO service_role;