ALTER POLICY "consented_visitors_create_public_events"
ON public.public_events
WITH CHECK (
  page_path IN ('/', '/sobre', '/contato', '/privacidade', '/termos')
  AND event_type IN ('page_view', 'ad_click')
  AND (
    (event_type = 'page_view' AND ad_slot IS NULL)
    OR
    (event_type = 'ad_click' AND ad_slot IN ('home-inline', 'about-inline', 'contact-inline'))
  )
  AND created_at >= now() - interval '5 minutes'
  AND created_at <= now() + interval '1 minute'
);