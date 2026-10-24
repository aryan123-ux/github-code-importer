import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const activatePrivatePillars = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { savePillarExecution } = await import("./pillar-logs.server");
  return savePillarExecution(context.supabase, context.userId, "simulation_active");
});