GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_sent TO service_role;
GRANT ALL ON public.push_cron_token TO service_role;