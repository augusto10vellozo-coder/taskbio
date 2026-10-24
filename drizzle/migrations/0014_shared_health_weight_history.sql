ALTER TABLE public.progress_entries ADD COLUMN IF NOT EXISTS superseded boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.progress_entries.superseded IS 'Historical duplicate retained for recovery; excluded from active weight history.';
ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS health_weight_imported_at timestamptz;
INSERT INTO public.progress_entries(user_id,entry_date,kind,value,unit,label,created_at,updated_at)
SELECT u.user_id, w.key::date, 'weight', w.value::text::numeric, 'kg', 'Peso', u.updated_at, u.updated_at
FROM public.user_data u CROSS JOIN LATERAL jsonb_each(COALESCE(u.settings->'health'->'weight','{}'::jsonb)) w
WHERE w.key ~ '^\d{4}-\d{2}-\d{2}$' AND jsonb_typeof(w.value) = 'number' AND w.value::text::numeric > 0
AND NOT EXISTS (SELECT 1 FROM public.progress_entries p WHERE p.user_id=u.user_id AND p.kind='weight' AND p.entry_date=w.key::date AND p.value=w.value::text::numeric);
WITH ranked AS (SELECT id, row_number() OVER (PARTITION BY user_id,entry_date ORDER BY updated_at DESC,created_at DESC,id DESC) n FROM public.progress_entries WHERE kind='weight' AND NOT superseded)
UPDATE public.progress_entries SET superseded=true WHERE id IN (SELECT id FROM ranked WHERE n>1);
UPDATE public.user_data SET health_weight_imported_at=now() WHERE health_weight_imported_at IS NULL;
CREATE UNIQUE INDEX progress_one_active_weight_per_day ON public.progress_entries(user_id,entry_date) WHERE kind='weight' AND NOT superseded;
CREATE OR REPLACE FUNCTION public.save_progress_weight(_date date,_value numeric,_notes text DEFAULT NULL)
RETURNS SETOF public.progress_entries LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL OR _value <= 0 OR _value >= 500 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
RETURN QUERY INSERT INTO public.progress_entries(user_id,entry_date,kind,value,unit,label,notes)
VALUES(auth.uid(),_date,'weight',_value,'kg','Peso',_notes)
ON CONFLICT(user_id,entry_date) WHERE kind='weight' AND NOT superseded
DO UPDATE SET value=EXCLUDED.value, notes=COALESCE(EXCLUDED.notes,progress_entries.notes), updated_at=now()
RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.save_progress_weight(date,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_progress_weight(date,numeric,text) TO authenticated;
COMMENT ON COLUMN public.user_data.health_weight_imported_at IS 'Legacy settings.health.weight imported once; deprecated JSON weight is no longer read or written by Saúde.';