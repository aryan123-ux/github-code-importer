export const pillarNames = ["monitoring", "pqc", "meta_learning"] as const;
export type PillarName = typeof pillarNames[number];
export type PillarState = "simulation_active" | "syncing" | "complete" | "blocked";
// No endpoint names, repository identifiers, code, credentials or tenant content.
export function simulatedPillarEvents(userId: string, state: PillarState = "simulation_active") {
  return pillarNames.map(pillar => ({ user_id: userId, pillar, state, simulation: true as const }));
}