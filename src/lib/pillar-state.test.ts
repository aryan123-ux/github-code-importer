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

for (const state of ["syncing", "complete", "blocked", "simulation_active"] as const) {
  test(`every ${state} execution logs all three private simulated pillars`, () => {
    const rows = simulatedPillarEvents("owner-a", state);
    assert.deepEqual(rows.map(row => row.pillar), ["monitoring", "pqc", "meta_learning"]);
    assert.equal(rows.length, 3);
    assert.ok(rows.every(row => row.user_id === "owner-a" && row.state === state && row.simulation === true));
    assert.deepEqual(Object.keys(rows[0] ?? {}).sort(), ["pillar", "simulation", "state", "user_id"]);
  });
}