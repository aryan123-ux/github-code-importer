import { test } from "node:test";
import { strict as assert } from "node:assert";
import { githubRequestPath } from "./github-access";
test("private repository file requests stay pinned through GitHub API", () => {
  const commit = "a".repeat(40);
  assert.deepEqual(githubRequestPath(`https://raw.githubusercontent.com/owner/repo/${commit}/src/index.ts`), { path: `/repos/owner/repo/contents/src/index.ts?ref=${commit}`, raw: true });
  assert.throws(() => githubRequestPath("https://evil.example/repos/owner/repo/git/trees/HEAD"));
  assert.throws(() => githubRequestPath("https://raw.githubusercontent.com/owner/repo/HEAD/package.json"));
});