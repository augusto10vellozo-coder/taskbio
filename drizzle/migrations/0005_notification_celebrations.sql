ALTER TABLE public.xp_events DROP CONSTRAINT IF EXISTS xp_events_kind_check;
ALTER TABLE public.xp_events ADD CONSTRAINT xp_events_kind_check CHECK (kind IN ('habit','block','meal','workout','photo','bonus'));

CREATE TABLE public.league_positions (
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  position integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
GRANT ALL ON public.league_positions TO service_role;
ALTER TABLE public.league_positions ENABLE ROW LEVEL SECURITY;