CREATE TABLE public.content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  criteria text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  clarity_score smallint,
  utility_score smallint,
  suitability_score smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reviews_scores CHECK (
    (clarity_score IS NULL OR clarity_score BETWEEN 0 AND 100) AND
    (utility_score IS NULL OR utility_score BETWEEN 0 AND 100) AND
    (suitability_score IS NULL OR suitability_score BETWEEN 0 AND 100)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_reviews TO authenticated;
GRANT ALL ON public.content_reviews TO service_role;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_content_reviews" ON public.content_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins_create_content_reviews" ON public.content_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins_update_content_reviews" ON public.content_reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins_delete_content_reviews" ON public.content_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER content_reviews_updated_at BEFORE UPDATE ON public.content_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.public_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_path text NOT NULL CHECK (page_path IN ('/', '/sobre', '/contato', '/privacidade', '/termos')),
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'ad_click')),
  ad_slot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_events_ad_slot CHECK (
    (event_type = 'page_view' AND ad_slot IS NULL) OR
    (event_type = 'ad_click' AND ad_slot IN ('home-inline', 'about-inline', 'contact-inline'))
  )
);
GRANT INSERT ON public.public_events TO anon, authenticated;
GRANT SELECT ON public.public_events TO authenticated;
GRANT ALL ON public.public_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.public_events_id_seq TO anon, authenticated;
ALTER TABLE public.public_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consented_visitors_create_public_events" ON public.public_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins_read_public_events" ON public.public_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX public_events_created_at_idx ON public.public_events (created_at DESC);
CREATE INDEX public_events_page_type_idx ON public.public_events (page_path, event_type);