export const GITHUB_SCOPES = ["read:user", "repo"];
export const GITHUB_GATEWAY = "https://connector-gateway.lovable.dev";
export function githubRequestPath(url: string): { path: string; raw: boolean } {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Invalid GitHub request.");
  if (parsed.hostname === "api.github.com" && /^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(commits|git\/trees|contents)\//.test(parsed.pathname)) return { path: parsed.pathname + parsed.search, raw: parsed.pathname.includes("/contents/") };
  if (parsed.hostname === "raw.githubusercontent.com") {
    const [, owner, repo, commit, ...file] = parsed.pathname.split("/");
    if (owner && repo && commit && /^[a-f0-9]{40}$/.test(commit) && file.length) return { path: `/repos/${owner}/${repo}/contents/${file.join("/")}?ref=${commit}`, raw: true };
  }
  throw new Error("Unsupported GitHub request.");
}