CREATE TABLE public.patch_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  patch_vector smallint[] NOT NULL,
  simulation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abstract_vector_shape CHECK (array_ndims(patch_vector) = 1 AND array_length(patch_vector, 1) = 3 AND array_lower(patch_vector, 1) = 1 AND array_position(patch_vector, NULL) IS NULL AND patch_vector <@ ARRAY[0,1,2,3]::smallint[]),
  CONSTRAINT simulation_only CHECK (simulation = true)
);
GRANT SELECT, INSERT ON public.patch_telemetry TO authenticated;
GRANT ALL ON public.patch_telemetry TO service_role;
ALTER TABLE public.patch_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read private patch pulses" ON public.patch_telemetry FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners insert private patch pulses" ON public.patch_telemetry FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE INDEX patch_telemetry_owner_created ON public.patch_telemetry (user_id, created_at DESC);
COMMENT ON TABLE public.patch_telemetry IS 'Owner-private coarse numeric patch vectors only. Simulated training; no code, repository identifiers, prompts, or cross-tenant aggregation.';