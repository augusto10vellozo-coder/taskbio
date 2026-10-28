CREATE OR REPLACE FUNCTION public.day_plan_counts(_user_id uuid, _day date, OUT planned integer, OUT done integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ud record; s jsonb; m jsonb; blocks jsonb; d text := _day::text;
  ws date := date_trunc('week', _day::timestamp)::date;
  h jsonb; tgt int; marks int; n int; k int;
BEGIN
  planned := 0; done := 0;
  SELECT plan, settings INTO ud FROM public.user_data WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;
  s := COALESCE(ud.settings, '{}'::jsonb); m := COALESCE(s->'modules', '{}'::jsonb);
  blocks := CASE WHEN jsonb_typeof(ud.plan->d) = 'array' THEN ud.plan->d ELSE '[]'::jsonb END;
  IF COALESCE((m->>'alimentacao')::boolean, true) THEN
    SELECT count(*), count(*) FILTER (WHERE CASE WHEN b ? 'plannedMeal' THEN b->'plannedMeal'->>'state' = 'consumida' ELSE (b->>'done')::boolean IS TRUE END)
      INTO n, k FROM jsonb_array_elements(blocks) b WHERE b->>'kind' = 'refeicao';
    planned := planned + n; done := done + k;
  END IF;
  IF COALESCE((m->>'treino')::boolean, true) THEN
    SELECT count(*), count(*) FILTER (WHERE (b->>'done')::boolean IS TRUE)
      INTO n, k FROM jsonb_array_elements(blocks) b WHERE b->>'kind' = 'treino';
    planned := planned + n; done := done + k;
  END IF;
  IF COALESCE((m->>'habitos')::boolean, true) AND jsonb_typeof(s->'habits') = 'array' THEN
    FOR h IN SELECT value FROM jsonb_array_elements(s->'habits') LOOP
      CONTINUE WHEN left(COALESCE(h->>'createdAt', '0000'), 10) > d;
      IF COALESCE(s->'habitLog'->d, '[]'::jsonb) ? (h->>'id') THEN
        planned := planned + 1; done := done + 1;
      ELSIF h->>'frequency' = 'weekly' THEN
        tgt := CASE WHEN h->>'weeklyTarget' ~ '^[1-6]$' THEN (h->>'weeklyTarget')::int ELSE 3 END;
        SELECT count(*) INTO marks FROM jsonb_each(COALESCE(s->'habitLog', '{}'::jsonb)) l(lk, lv)
          WHERE lk >= ws::text AND lk < d AND lv ? (h->>'id');
        IF marks < tgt THEN planned := planned + 1; END IF;
      ELSE
        planned := planned + 1;
      END IF;
    END LOOP;
  END IF;
  -- Reading/study count from the first recorded session on, so turning a module on never penalizes earlier days.
  IF COALESCE((m->>'leitura')::boolean, false) AND COALESCE(NULLIF(s->'trackers'->>'readingGoal','')::numeric, 180) > 0
     AND d >= COALESCE((SELECT MIN(x->>'date') FROM jsonb_array_elements(COALESCE(s->'trackers'->'leitura', '[]'::jsonb)) x), '9999') THEN
    planned := planned + 1;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s->'trackers'->'leitura', '[]'::jsonb)) x WHERE x->>'date' = d) THEN done := done + 1; END IF;
  END IF;
  IF COALESCE((m->>'estudos')::boolean, false) AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(s->'trackers'->'subjects', '[]'::jsonb)) x WHERE COALESCE(NULLIF(x->>'dailyGoalMin','')::numeric, 0) > 0)
     AND d >= COALESCE((SELECT MIN(x->>'date') FROM jsonb_array_elements(COALESCE(s->'trackers'->'estudos', '[]'::jsonb)) x), '9999') THEN
    planned := planned + 1;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s->'trackers'->'estudos', '[]'::jsonb)) x WHERE x->>'date' = d) THEN done := done + 1; END IF;
  END IF;
  IF COALESCE((m->>'financas')::boolean, false) THEN
    SELECT count(*), count(*) FILTER (WHERE (x->>'paid')::boolean IS TRUE)
      INTO n, k FROM jsonb_array_elements(COALESCE(s->'finance'->'bills', '[]'::jsonb)) x WHERE x->>'dueDate' = d;
    planned := planned + n; done := done + k;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.day_plan_counts(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.day_plan_counts(uuid, date) TO service_role;