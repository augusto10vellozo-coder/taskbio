CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider text NOT NULL DEFAULT 'paddle',
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  plan text NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_read_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "active_professionals_read_client_data" ON public.user_data FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.professional_clients link
    WHERE link.professional_id = auth.uid()
      AND link.client_id = user_data.user_id
      AND link.status = 'active'::public.client_link_status
      AND public.has_role(auth.uid(), 'professional'::public.app_role)
  )
);

CREATE POLICY "active_professionals_read_client_progress" ON public.progress_entries FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.professional_clients link
    WHERE link.professional_id = auth.uid()
      AND link.client_id = progress_entries.user_id
      AND link.status = 'active'::public.client_link_status
      AND public.has_role(auth.uid(), 'professional'::public.app_role)
  )
);

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requesting_user uuid := auth.uid();
BEGIN
  IF requesting_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  DELETE FROM auth.users WHERE id = requesting_user;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;