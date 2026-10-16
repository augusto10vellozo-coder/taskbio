-- Read-only regression against the three existing participants from the reported invitation flow.
-- Execute each pair in the same database session. Every assertion must return true.
SELECT set_config('request.jwt.claim.sub', 'eebff9a7-058f-42fc-b707-659efaadd185', false);
SELECT array_agg(user_id ORDER BY user_id) = ARRAY['5c3c2b81-1d52-4221-a33a-e8bf2a54a8c9'::uuid, 'c52276d7-d798-4f80-b7cf-4d7a0ed75026'::uuid, 'eebff9a7-058f-42fc-b707-659efaadd185'::uuid] AS host_sees_three FROM public.league_week('2026-10-11');
SELECT set_config('request.jwt.claim.sub', 'c52276d7-d798-4f80-b7cf-4d7a0ed75026', false);
SELECT array_agg(user_id ORDER BY user_id) = ARRAY['5c3c2b81-1d52-4221-a33a-e8bf2a54a8c9'::uuid, 'c52276d7-d798-4f80-b7cf-4d7a0ed75026'::uuid, 'eebff9a7-058f-42fc-b707-659efaadd185'::uuid] AS first_guest_sees_three FROM public.league_week('2026-10-11');
SELECT set_config('request.jwt.claim.sub', '5c3c2b81-1d52-4221-a33a-e8bf2a54a8c9', false);
SELECT array_agg(user_id ORDER BY user_id) = ARRAY['5c3c2b81-1d52-4221-a33a-e8bf2a54a8c9'::uuid, 'c52276d7-d798-4f80-b7cf-4d7a0ed75026'::uuid, 'eebff9a7-058f-42fc-b707-659efaadd185'::uuid] AS second_guest_sees_three FROM public.league_week('2026-10-11');
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT count(*) = 0 AS no_unsigned_members FROM public.league_week('2026-10-11');