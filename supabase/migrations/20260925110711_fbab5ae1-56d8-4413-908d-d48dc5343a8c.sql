DROP POLICY IF EXISTS participants_update_links ON public.professional_clients;

CREATE POLICY clients_respond_to_invites
ON public.professional_clients
FOR UPDATE
TO authenticated
USING (
  auth.uid() = client_id
  OR (
    client_id IS NULL
    AND lower(invite_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
)
WITH CHECK (
  auth.uid() = client_id
  AND status IN ('active'::public.client_link_status, 'declined'::public.client_link_status, 'ended'::public.client_link_status)
);

CREATE POLICY professionals_end_links
ON public.professional_clients
FOR UPDATE
TO authenticated
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional'::public.app_role)
)
WITH CHECK (
  auth.uid() = professional_id
  AND status = 'ended'::public.client_link_status
);

CREATE POLICY professionals_find_profiles
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'professional'::public.app_role));

CREATE POLICY invitees_read_pending_links
ON public.professional_clients
FOR SELECT
TO authenticated
USING (
  client_id IS NULL
  AND lower(invite_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);