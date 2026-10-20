import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RepoInput = z.object({ repo: z.string().trim().min(3).max(300) });
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Verification failed. Hotfix blocked.";
  // Never return parser source excerpts or arbitrary provider responses.
  return { status: "blocked" as const, error: message.includes("Hotfix blocked") || message.startsWith("Enter a valid") ? message : "Repository files could not be parsed or fetched. Hotfix blocked." };
}

export const recheckRepoDependencies = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RepoInput.parse(data))
  .handler(async ({ data }) => {
    try {
      const { snapshotRepository } = await import("./audit-repository.server");
      const snapshot = await snapshotRepository(data.repo);
      return { status: "rechecked" as const, commit: snapshot.commit, dependencies: snapshot.dependencies };
    } catch (error) { return failure(error); }
  });

export const runRepoAudit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RepoInput.extend({ commit: z.string().regex(/^[a-f0-9]{40}$/) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { runVerifiedRepositoryAudit } = await import("./audit-repository.server");
      // Client stage completion is never trusted: repeat dependency re-check server-side.
      return await runVerifiedRepositoryAudit(data.repo, data.commit);
    } catch (error) { return failure(error); }
  });

export type AuditReport = Awaited<ReturnType<typeof runRepoAudit>>;
