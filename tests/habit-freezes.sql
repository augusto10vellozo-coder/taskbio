-- Run against the application database in a transaction; fixtures are always rolled back.
BEGIN;
DO $$
DECLARE u uuid:=gen_random_uuid(); t date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 h jsonb; logs jsonb; counters record; milestone int;
BEGIN
 h:=jsonb_build_object('id','test-h','name','Teste proteção','createdAt',(t-50)::text,'frequency','daily');
 INSERT INTO public.user_data(user_id,settings) VALUES(u,jsonb_build_object('habits',jsonb_build_array(h),'habitLog','{}'::jsonb,'modules',jsonb_build_object('habitos',true,'alimentacao',false,'treino',false)));
 FOR milestone IN 1..4 LOOP
  SELECT jsonb_object_agg((t-i)::text,jsonb_build_array('test-h')) INTO logs FROM generate_series(1,milestone*10) i;
  UPDATE public.user_data SET settings=jsonb_set(settings,'{habitLog}',logs) WHERE user_id=u;
  ASSERT public.habit_freeze_balance(u)=LEAST(3,milestone), '10/20/30/40 completions must produce 1/2/3/3';
 END LOOP;
 UPDATE public.user_data SET settings=jsonb_set(settings,'{habitLog}',logs) WHERE user_id=u;
 ASSERT (SELECT count(*) FROM public.habit_freeze_completions WHERE user_id=u)=40, 'resync must not count twice';
 DELETE FROM public.habit_freeze_events WHERE user_id=u;
 DELETE FROM public.habit_freeze_completions WHERE user_id=u;
 SELECT jsonb_object_agg((t-i)::text,jsonb_build_array('test-h')) INTO logs FROM generate_series(2,11) i;
 UPDATE public.user_data SET settings=jsonb_set(settings,'{habitLog}',logs) WHERE user_id=u;
 ASSERT public.habit_freeze_balance(u)=1, 'fixture earns 1';
 UPDATE public.habit_freeze_accounts SET started_day=t-1,processed_day=NULL WHERE user_id=u;
 PERFORM public.process_habit_freezes(u);
 ASSERT public.habit_freeze_balance(u)=0, 'missed day consumes 1';
 ASSERT public.habit_protected_streak(u,h,logs,t)=11, 'individual streak remains alive';
 SELECT * INTO counters FROM public.day_plan_counts(u,t-1);
 ASSERT counters.planned=1 AND counters.done=0, 'frozen day must not count as complete';
 ASSERT (SELECT count(*) FROM public.xp_events WHERE user_id=u)=0, 'freeze grants no XP';
 PERFORM public.process_habit_freezes(u);
 ASSERT (SELECT count(*) FROM public.habit_freeze_events WHERE user_id=u AND kind='use')=1, 'idempotent midnight';
 logs:=jsonb_set(logs,ARRAY[(t-1)::text],jsonb_build_array('test-h'));
 UPDATE public.user_data SET settings=jsonb_set(settings,'{habitLog}',logs) WHERE user_id=u;
 ASSERT public.habit_freeze_balance(u)=1, 'retroactive mark refunds 1';
 ASSERT (SELECT count(*) FROM public.habit_freeze_events WHERE user_id=u AND kind='refund')=1, 'unique refund';
 SELECT * INTO counters FROM public.day_plan_counts(u,t-1);
 ASSERT counters.done=1, 'real retroactive mark counts';
 DELETE FROM public.habit_freeze_events WHERE user_id=u;
 logs:=logs-(t-1)::text;
 UPDATE public.user_data SET settings=jsonb_set(settings,'{habitLog}',logs) WHERE user_id=u;
 UPDATE public.habit_freeze_accounts SET processed_day=t-2 WHERE user_id=u;
 PERFORM public.process_habit_freezes(u);
 ASSERT public.habit_freeze_balance(u)=0, 'balance never negative';
 ASSERT EXISTS(SELECT 1 FROM public.habit_freeze_events WHERE user_id=u AND kind='break' AND streak=10), 'break notice keeps previous streak';
 ASSERT public.habit_protected_streak(u,h,logs,t)=0, 'without balance streak breaks';
END $$;
ROLLBACK;