-- Fix security definer view by recreating as security invoker
DROP VIEW IF EXISTS public.oauth_app_public_info;

CREATE VIEW public.oauth_app_public_info 
WITH (security_invoker = true)
AS
SELECT id, name, client_id, redirect_uris, scopes
FROM oauth_applications;

-- Grant SELECT on the view
GRANT SELECT ON public.oauth_app_public_info TO authenticated;
GRANT SELECT ON public.oauth_app_public_info TO anon;