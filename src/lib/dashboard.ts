export const startupPlan = { monthlyPrice: 29, anchorPrice: 499, trialDays: 14, earlyUserLimit: 100 };
export const enterprisePlan = { anchorPrice: 899 };

export function parseGitHubRepository(input: string): string | null {
  const value = input.trim();
  const path = value.replace(/^https:\/\/github\.com\//i, "").replace(/\.git\/?$/, "").replace(/\/$/, "");
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]+$/i.test(path)) return null;
  const [owner, repo] = path.split("/");
  if (!owner || !repo || repo === "." || repo === "..") return null;
  return `https://github.com/${owner}/${repo}`;
}