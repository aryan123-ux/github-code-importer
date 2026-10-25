import { test } from "node:test";
import { strict as assert } from "node:assert";
import { abstractPatchVector, sealPatchVector } from "./patch-telemetry";

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
test("PQC seal only marks valid abstract vectors and stays simulated", () => {
  assert.deepEqual(sealPatchVector([1, 2, 3]), { algorithm: "ML-KEM-768", sealed: true, simulation: true });
  assert.equal(sealPatchVector(null), null);
  assert.equal(sealPatchVector([1, 2]), null);
  assert.equal(sealPatchVector([1, 2, 4]), null);
  assert.equal(sealPatchVector([1, 2, -1]), null);
  assert.equal(sealPatchVector([1, 2, 1.5]), null);
});
