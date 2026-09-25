ALTER TABLE public.subscriptions
  DROP CONSTRAINT subscriptions_user_id_key,
  ADD COLUMN paddle_subscription_id text,
  ADD COLUMN paddle_customer_id text,
  ADD COLUMN product_id text,
  ADD COLUMN price_id text,
  ADD COLUMN current_period_start timestamptz,
  ADD COLUMN environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live'));

CREATE UNIQUE INDEX subscriptions_paddle_subscription_id_key ON public.subscriptions(paddle_subscription_id) WHERE paddle_subscription_id IS NOT NULL;
CREATE INDEX subscriptions_user_environment_idx ON public.subscriptions(user_id, environment, created_at DESC);