import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulatedPillarEvents } from "./pillar-state";

export const activatePrivatePillars = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { error } = await context.supabase.from("pillar_states").insert(simulatedPillarEvents(context.userId));
  if (error) throw new Error("Pillar states could not be saved.");
  const result = await context.supabase.from("pillar_states").select("id, pillar, state, simulation, created_at")
    .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30);
  if (result.error) throw new Error("Pillar states could not be confirmed.");
  return result.data;
});