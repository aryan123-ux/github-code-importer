import { parseGitHubRepository } from "./dashboard";
import { extractEndpointCalls, recheckDependencies, verifiedSolution, verifyEndpointSignatures, type VerifiedEndpoint } from "./audit-verification";

type TreeEntry = { path: string; type: string; size?: number };
export type RepositorySnapshot = { repo: string; commit: string; files: TreeEntry[]; dependencies: number };
async function read(url: string): Promise<string> {
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000), headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub fetch failed (${response.status}). Use a public repository; check GitHub availability or quota. Hotfix blocked.`);
  if (Number(response.headers.get("content-length") ?? 0) > 2_000_000) throw new Error("Repository file exceeds the audit size limit. Hotfix blocked.");
  if (!response.body) throw new Error("Repository response is empty. Hotfix blocked.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2_000_000) { await reader.cancel(); throw new Error("Repository file exceeds the audit size limit. Hotfix blocked."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
function fileUrl(snapshot: Pick<RepositorySnapshot, "repo" | "commit">, path: string) {
  return `https://raw.githubusercontent.com/${snapshot.repo}/${snapshot.commit}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export async function snapshotRepository(input: string, pinnedCommit?: string): Promise<RepositorySnapshot> {
  const normalized = parseGitHubRepository(input);
  if (!normalized) throw new Error("Enter a valid public GitHub repository.");
  const repo = normalized.replace("https://github.com/", "");
  const revision = pinnedCommit ?? String((JSON.parse(await read(`https://api.github.com/repos/${repo}/commits/HEAD`)) as { sha?: string }).sha ?? "");
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Repository revision cannot be pinned. Hotfix blocked.");
  const tree = JSON.parse(await read(`https://api.github.com/repos/${repo}/git/trees/${revision}?recursive=1`)) as { tree?: TreeEntry[]; truncated?: boolean };
  if (!Array.isArray(tree.tree) || tree.truncated) throw new Error("Repository tree is incomplete. Hotfix blocked.");
  const snapshot = { repo, commit: revision, files: tree.tree.filter(file => file.type === "blob"), dependencies: 0 };
  for (const path of ["package.json", "package-lock.json"]) if (!snapshot.files.some(file => file.path === path)) throw new Error("Root package.json and npm package-lock v2/v3 are required. Hotfix blocked.");
  const manifest = await read(fileUrl(snapshot, "package.json"));
  const first = await read(fileUrl(snapshot, "package-lock.json"));
  // Immediate uncached re-fetch of the same dependency tree at the pinned commit.
  const second = await read(fileUrl(snapshot, "package-lock.json"));
  snapshot.dependencies = recheckDependencies(manifest, first, second);
  return snapshot;
}

export async function runVerifiedRepositoryAudit(input: string, commit: string) {
  let snapshot: RepositorySnapshot | null = null;
  return verifiedSolution(
    async () => { snapshot = await snapshotRepository(input, commit); },
    async (): Promise<VerifiedEndpoint[]> => {
      if (!snapshot) throw new Error("Dependency verification missing. Hotfix blocked.");
      const contracts = snapshot.files.filter(file => /(^|\/)[^/]*(openapi|swagger)[^/]*\.(json|ya?ml)$/i.test(file.path));
      const sources = snapshot.files.filter(file => /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file.path) && !/(^|\/)(node_modules|dist|build|vendor)\//.test(file.path) && !/(\.d\.ts|\.(test|spec)\.[jt]sx?)$/.test(file.path));
      if (!contracts.length) throw new Error("No repository OpenAPI/Swagger contracts found. Hotfix blocked.");
      if (contracts.length > 8 || sources.length > 60) throw new Error("Repository exceeds the static audit coverage limit. Hotfix blocked.");
      const texts = await Promise.all(contracts.map(file => read(fileUrl(snapshot, file.path))));
      const calls = (await Promise.all(sources.map(async file => extractEndpointCalls(file.path, await read(fileUrl(snapshot, file.path)))))).flat();
      return verifyEndpointSignatures(calls, texts);
    },
    async evidence => {
      const deprecated = evidence.filter(endpoint => endpoint.deprecated);
      return {
        status: "verified" as const,
        commit,
        dependencies: snapshot?.dependencies ?? 0,
        signaturePasses: 2 as const,
        endpoints: evidence.length,
        findings: deprecated.map(endpoint => ({ file: endpoint.file, line: endpoint.line, method: endpoint.method, path: endpoint.path, risk: "Repository contract marks this operation deprecated." })),
        solution: deprecated.length ? "Replace the contract-deprecated operations with replacements documented by the API owner, then rerun this audit. No replacement signature is inferred." : "No contract-deprecated operations found in the supported static calls. No hotfix is needed.",
      };
    },
  );
}