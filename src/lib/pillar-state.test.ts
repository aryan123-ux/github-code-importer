import { test } from "node:test";
import { strict as assert } from "node:assert";
import { simulatedPillarEvents } from "./pillar-state";

test("all three pillar states remain simulated and owner-scoped", () => {
  assert.deepEqual(simulatedPillarEvents("owner-a"), [
    { user_id: "owner-a", pillar: "monitoring", state: "simulation_active", simulation: true },
    { user_id: "owner-a", pillar: "pqc", state: "simulation_active", simulation: true },
    { user_id: "owner-a", pillar: "meta_learning", state: "simulation_active", simulation: true },
  ]);
  assert.equal(simulatedPillarEvents("owner-b")[0]?.user_id, "owner-b");
});