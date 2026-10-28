-- Consistency score 0-100: training and meals only (50/50, or 100% of the single active one), plus sleep bonus (max 10). Never computed in the browser.
CREATE OR REPLACE FUNCTION public.consistency_formula(_t_done int, _t_planned int, _m_done int, _m_planned int, _t_on boolean, _m_on boolean, _sleep_days int)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  WITH c AS (
    SELECT CASE WHEN _t_on AND _t_planned > 0 THEN _t_done::numeric / _t_planned END AS t,
           CASE WHEN _m_on AND _m_planned > 0 THEN _m_done::numeric / _m_planned END AS m
  )
  SELECT CASE WHEN t IS NULL AND m IS NULL THEN NULL
    ELSE LEAST(100, ROUND(100 * CASE WHEN t IS NOT NULL AND m IS NOT NULL THEN (t + m) / 2 ELSE COALESCE(t, m) END) + LEAST(10, GREATEST(0, _sleep_days)))::int END
  FROM c;
$$;
GRANT EXECUTE ON FUNCTION public.consistency_formula(int, int, int, int, boolean, boolean, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consistency_score(_start date, _end date)
RETURNS TABLE(score integer, training_on boolean, meals_on boolean, training_done integer, training_planned integer, meals_done integer, meals_planned integer, sleep_days integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid(); ud record; s jsonb; m jsonb; goal numeric;
  last date := LEAST(_end, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
BEGIN
  IF me IS NULL OR _end - _start > 120 THEN RETURN; END IF;
  SELECT plan, settings INTO ud FROM public.user_data WHERE user_id = me;
  s := COALESCE(ud.settings, '{}'::jsonb); m := COALESCE(s->'modules', '{}'::jsonb);
  training_on := COALESCE((m->>'treino')::boolean, true);
  meals_on := COALESCE((m->>'alimentacao')::boolean, true);
  SELECT count(*) FILTER (WHERE b->>'kind' = 'treino'),
         count(*) FILTER (WHERE b->>'kind' = 'treino' AND (b->>'done')::boolean IS TRUE),
         count(*) FILTER (WHERE b->>'kind' = 'refeicao'),
         count(*) FILTER (WHERE b->>'kind' = 'refeicao' AND CASE WHEN b ? 'plannedMeal' THEN b->'plannedMeal'->>'state' = 'consumida' ELSE (b->>'done')::boolean IS TRUE END)
    INTO training_planned, training_done, meals_planned, meals_done
  FROM jsonb_each(CASE WHEN jsonb_typeof(ud.plan) = 'object' THEN ud.plan ELSE '{}'::jsonb END) p(day, blocks),
       LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(blocks) = 'array' THEN blocks ELSE '[]'::jsonb END) b
  WHERE p.day ~ '^\d{4}-\d{2}-\d{2}$' AND p.day::date BETWEEN _start AND last;
  goal := NULLIF(s->'health'->>'sleepGoal', '')::numeric;
  SELECT count(*) INTO sleep_days FROM jsonb_each_text(COALESCE(s->'health'->'sleep', '{}'::jsonb)) x(day, hours)
    WHERE goal > 0 AND x.day ~ '^\d{4}-\d{2}-\d{2}$' AND x.day::date BETWEEN _start AND last AND x.hours ~ '^[0-9.]+$' AND x.hours::numeric >= goal;
  score := public.consistency_formula(training_done, training_planned, meals_done, meals_planned, training_on, meals_on, sleep_days);
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.consistency_score(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consistency_score(date, date) TO authenticated, service_role;