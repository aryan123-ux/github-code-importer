import { test } from "node:test";
import { strict as assert } from "node:assert";
import { snapshotRepository } from "./audit-repository.server";

test("scanner fetches public package.json via GitHub API and immediately rechecks pinned lockfile", async () => {
  const commit = "a".repeat(40);
  const requests: { url: string; accept: string | null }[] = [];
  const snapshot = await snapshotRepository("owner/repo", commit, async (url, init) => {
    requests.push({ url, accept: new Headers(init.headers).get("Accept") });
    if (url.includes("/git/trees/")) return Response.json({ tree: [{ path: "package.json", type: "blob" }, { path: "package-lock.json", type: "blob" }] });
    if (url.includes("/contents/package.json")) return Response.json({ dependencies: { example: "1.0.0" } });
    if (url.includes("/contents/package-lock.json")) return Response.json({ lockfileVersion: 3, packages: { "": { dependencies: { example: "1.0.0" } }, "node_modules/example": { version: "1.0.0" } } });
    throw new Error("Unexpected request");
  });
  assert.equal(snapshot.commit, commit);
  assert.deepEqual(requests.slice(1), [
    { url: `https://api.github.com/repos/owner/repo/contents/package.json?ref=${commit}`, accept: "application/vnd.github.raw+json" },
    { url: `https://api.github.com/repos/owner/repo/contents/package-lock.json?ref=${commit}`, accept: "application/vnd.github.raw+json" },
    { url: `https://api.github.com/repos/owner/repo/contents/package-lock.json?ref=${commit}`, accept: "application/vnd.github.raw+json" },
  ]);
});