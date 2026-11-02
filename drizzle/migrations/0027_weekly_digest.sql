-- One row per user and week so a retry never sends the same digest twice.
CREATE TABLE IF NOT EXISTS public.weekly_digest_sent (
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_digest_week_idx ON public.weekly_digest_sent(week_start);

ALTER TABLE public.weekly_digest_sent ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server) reads and writes this table.

COMMENT ON TABLE public.weekly_digest_sent IS 'Idempotency ledger for the weekly e-mail digest.';
