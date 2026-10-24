import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { simulatedPillarEvents, type PillarState } from "./pillar-state";

export async function savePillarExecution(client: SupabaseClient<Database>, userId: string, state: PillarState) {
  const written = await client.from("pillar_states").insert(simulatedPillarEvents(userId, state)).select("id");
  if (written.error || written.data?.length !== 3) throw new Error("Private pillar logs could not be saved.");
  const confirmed = await client.from("pillar_states").select("id, pillar, state, simulation, created_at")
    .eq("user_id", userId).in("id", written.data.map(row => row.id));
  if (confirmed.error || confirmed.data?.length !== 3) throw new Error("Private pillar logs could not be confirmed.");
  return confirmed.data;
}