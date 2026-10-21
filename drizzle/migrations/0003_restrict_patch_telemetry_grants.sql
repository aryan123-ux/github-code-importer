REVOKE ALL ON public.patch_telemetry FROM anon;
REVOKE ALL ON public.patch_telemetry FROM authenticated;
GRANT SELECT, INSERT ON public.patch_telemetry TO authenticated;
GRANT ALL ON public.patch_telemetry TO service_role;