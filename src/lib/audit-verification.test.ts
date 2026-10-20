import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { extractEndpointCalls, recheckDependencies, verifiedSolution, verifyEndpointSignatures, verifyTwice } from "./audit-verification";

const manifest = JSON.stringify({ dependencies: { example: "1.0.0" } });
const lock = JSON.stringify({ lockfileVersion: 3, packages: { "": { dependencies: { example: "1.0.0" } }, "node_modules/example": { version: "1.0.0" } } });
const contract = JSON.stringify({ openapi: "3.0.3", paths: { "/pets/{id}": { get: { deprecated: true, responses: { "200": { description: "OK" } } } } } });
const calls = extractEndpointCalls("src/client.ts", 'fetch("/pets/123");');

describe("strict verification order", () => {
  test("immediate dependency re-fetch must match", () => {
    assert.equal(recheckDependencies(manifest, lock, lock), 1);
    assert.throws(() => recheckDependencies(manifest, lock, lock + " "), /changed/);
  });
  test("manifest disagreement blocks", () => assert.throws(() => recheckDependencies('{"dependencies":{"other":"1"}}', lock, lock), /disagree/));
  test("solution runs only after re-check and exactly two signature passes", async () => {
    const events: string[] = [];
    await verifiedSolution(async () => { events.push("recheck"); }, async () => { events.push("verify"); return true; }, async () => { events.push("solution"); });
    assert.deepEqual(events, ["recheck", "verify", "verify", "solution"]);
  });
  test("failed dependency check never verifies or generates", async () => {
    let invoked = false;
    await assert.rejects(verifiedSolution(async () => { throw new Error("blocked"); }, async () => { invoked = true; }, async () => { invoked = true; }));
    assert.equal(invoked, false);
  });
  test("second signature failure never generates", async () => {
    let count = 0; let generated = false;
    await assert.rejects(verifiedSolution(async () => {}, async () => { if (++count === 2) throw new Error("blocked"); return true; }, async () => { generated = true; }));
    assert.equal(count, 2); assert.equal(generated, false);
  });
  test("disagreeing passes block", async () => { let count = 0; await assert.rejects(verifyTwice(async () => ++count), /disagree/); });
});
describe("repository endpoint contracts", () => {
  test("matches method and literal path to deprecated contract", () => assert.equal(verifyEndpointSignatures(calls, [contract])[0]?.deprecated, true));
  test("missing contracts block", () => assert.throws(() => verifyEndpointSignatures(calls, []), /required/));
  test("empty call sets block", () => assert.throws(() => verifyEndpointSignatures([], [contract]), /required/));
  test("wrong method blocks", () => assert.throws(() => verifyEndpointSignatures([{ ...calls[0], file: "x", line: 1, path: "/pets/123", method: "DELETE", query: [], hasBody: false }], [contract]), /signature/));
  test("computed URLs block", () => assert.throws(() => extractEndpointCalls("x.ts", "fetch(base + '/pets')"), /Computed/));
  test("comments do not create calls", () => assert.deepEqual(extractEndpointCalls("x.ts", '// fetch("/pets/123")'), []));
  test("unresolved schema references block", () => assert.throws(() => verifyEndpointSignatures(calls, ['{"openapi":"3.0.0","paths":{},"components":{"schemas":{"X":{"$ref":"https://bad.invalid"}}}}']), /Referenced/));
});