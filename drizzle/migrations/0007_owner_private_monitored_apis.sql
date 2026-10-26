CREATE TABLE public.monitored_apis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  endpoint_url text NOT NULL CHECK (char_length(endpoint_url) <= 2048 AND endpoint_url ~ '^https?://[^[:space:]]+$'),
  check_interval integer NOT NULL DEFAULT 60 CHECK (check_interval > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_apis TO authenticated;
GRANT ALL ON public.monitored_apis TO service_role;
ALTER TABLE public.monitored_apis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read monitored APIs" ON public.monitored_apis FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners create monitored APIs" ON public.monitored_apis FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners update monitored APIs" ON public.monitored_apis FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners delete monitored APIs" ON public.monitored_apis FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE INDEX monitored_apis_owner_idx ON public.monitored_apis(user_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitored_apis;