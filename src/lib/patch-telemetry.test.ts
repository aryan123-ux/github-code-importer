import { test } from "node:test";
import { strict as assert } from "node:assert";
import { abstractPatchVector } from "./patch-telemetry";

test("only twice-verified recommendations produce telemetry", () => {
  assert.equal(abstractPatchVector({ status: "blocked", findings: [{}], signaturePasses: 2 }), null);
  assert.equal(abstractPatchVector({ status: "verified", findings: [{}], signaturePasses: 1 }), null);
  assert.equal(abstractPatchVector({ status: "verified", findings: [], signaturePasses: 2 }), null);
});
test("patch telemetry contains only three coarse numeric buckets", () => {
  const report = { status: "verified", signaturePasses: 2, dependencies: 120, endpoints: 12, findings: [{ file: "tenant-secret.ts", path: "/private", prompt: "secret" }] };
  assert.deepEqual(abstractPatchVector(report), [3, 2, 1]);
  assert.equal(JSON.stringify(abstractPatchVector(report)).includes("secret"), false);
});
