import { describe, expect, test } from "bun:test";
import { enterprisePlan, parseGitHubRepository, startupPlan } from "./dashboard";

describe("dashboard plan terms", () => {
  test("Startup costs $29 monthly", () => expect(startupPlan.monthlyPrice).toBe(29));
  test("Startup trial lasts 14 days", () => expect(startupPlan.trialDays).toBe(14));
  test("Startup anchor is $499", () => expect(startupPlan.anchorPrice).toBe(499));
  test("early offer is for first 100 users", () => expect(startupPlan.earlyUserLimit).toBe(100));
  test("Enterprise anchor is $899", () => expect(enterprisePlan.anchorPrice).toBe(899));
});

describe("repository input", () => {
  test("accepts a GitHub URL", () => expect(parseGitHubRepository("https://github.com/aryan123-ux/api-sentinel-1f45f181.git")).toBe("https://github.com/aryan123-ux/api-sentinel-1f45f181"));
  test("accepts owner/repository", () => expect(parseGitHubRepository("aryan123-ux/api-sentinel")).toBe("https://github.com/aryan123-ux/api-sentinel"));
  test("rejects external hosts and invalid paths", () => {
    for (const value of ["https://example.com/owner/repo", "", "owner", "owner/../", "https://github.com/owner/repo/tree/main"]) expect(parseGitHubRepository(value)).toBeNull();
  });
});