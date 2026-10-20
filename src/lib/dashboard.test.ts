import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { enterprisePlan, parseGitHubRepository, startupPlan } from "./dashboard";

describe("dashboard plan terms", () => {
  test("Startup costs $29 monthly", () => assert.equal(startupPlan.monthlyPrice, 29));
  test("Startup trial lasts 14 days", () => assert.equal(startupPlan.trialDays, 14));
  test("Startup anchor is $499", () => assert.equal(startupPlan.anchorPrice, 499));
  test("early offer is for first 100 users", () => assert.equal(startupPlan.earlyUserLimit, 100));
  test("Enterprise anchor is $899", () => assert.equal(enterprisePlan.anchorPrice, 899));
});

describe("repository input", () => {
  test("accepts a GitHub URL", () => assert.equal(parseGitHubRepository("https://github.com/aryan123-ux/api-sentinel-1f45f181.git"), "https://github.com/aryan123-ux/api-sentinel-1f45f181"));
  test("accepts owner/repository", () => assert.equal(parseGitHubRepository("aryan123-ux/api-sentinel"), "https://github.com/aryan123-ux/api-sentinel"));
  test("rejects external hosts and invalid paths", () => {
    for (const value of ["https://example.com/owner/repo", "", "owner", "owner/../", "https://github.com/owner/repo/tree/main"]) assert.equal(parseGitHubRepository(value), null);
  });
});