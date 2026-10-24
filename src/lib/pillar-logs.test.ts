import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { savePillarExecution } from "./pillar-logs.server";

function fakeClient(failReadback = false) {
  let rows: unknown;
  let owner: unknown;
  const client = { from: () => ({
    insert: (input: unknown) => { rows = input; return { select: async () => ({ data: [{ id: "1" }, { id: "2" }, { id: "3" }], error: null }) }; },
    select: () => ({ eq: (_key: string, id: string) => { owner = id; return { in: async () => ({ data: failReadback ? [] : [{ id: "1" }, { id: "2" }, { id: "3" }], error: null }) }; } }),
  }) } as unknown as SupabaseClient<Database>;
  return { client, rows: () => rows, owner: () => owner };
}

test("pillar execution completes only after three owner-scoped rows read back", async () => {
  const fake = fakeClient();
  await savePillarExecution(fake.client, "owner-a", "blocked");
  assert.equal(fake.owner(), "owner-a");
  assert.deepEqual(fake.rows(), ["monitoring", "pqc", "meta_learning"].map(pillar => ({ user_id: "owner-a", pillar, state: "blocked", simulation: true })));
});

test("missing pillar readback never reports logs saved", async () => {
  await assert.rejects(savePillarExecution(fakeClient(true).client, "owner-a", "complete"), /could not be confirmed/);
});