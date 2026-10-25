import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { abstractPatchVector, sealPatchVector } from "./patch-telemetry";

export const getPrivatePatchPulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("patch_telemetry")
      .select("id, created_at, patch_vector, simulation, pqc_simulation").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("Private telemetry unavailable.");
    return data;
  });

export const runPrivatePatchAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ repo: z.string().trim().min(3).max(300), commit: z.string().regex(/^[a-f0-9]{40}$/) }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { runVerifiedRepositoryAudit } = await import("./audit-repository.server");
    const { repositoryFetchForUser } = await import("./github-repository.server");
    const { savePillarExecution } = await import("./pillar-logs.server");
    const writeState = (state: "syncing" | "complete" | "blocked" | "simulation_active") => savePillarExecution(context.supabase, context.userId, state);
    await writeState("syncing");
    let report;
    try { report = await runVerifiedRepositoryAudit(data.repo, data.commit, await repositoryFetchForUser(context.userId)); }
    catch { const logs = await writeState("blocked"); return { report: { status: "blocked" as const, error: "Repository verification failed. Check GitHub access or reconnect. Hotfix blocked." }, telemetry: "skipped" as const, logs }; }
    const vector = abstractPatchVector(report);
    if (!vector) { const logs = await writeState("simulation_active"); return { report, telemetry: "skipped" as const, logs }; }
    // Simulated CRYSTALS-Kyber seal: only the coarse abstract vector crosses
    // this boundary; raw code, paths, and repo identifiers never leave the audit.
    const seal = sealPatchVector(vector);
    if (!seal) { const logs = await writeState("blocked"); return { report, telemetry: "failed" as const, logs }; }
    // Identity comes exclusively from verified auth, never client input. RLS remains active.
    const { data: pulse, error } = await context.supabase.from("patch_telemetry").insert({ user_id: context.userId, patch_vector: vector, simulation: true, pqc_simulation: seal.simulation }).select("id").single();
    if (error || !pulse) { const logs = await writeState("blocked"); return { report, telemetry: "failed" as const, logs }; }
    const readback = await context.supabase.from("patch_telemetry").select("id, pqc_simulation").eq("id", pulse.id).eq("user_id", context.userId).single();
    if (readback.error || !readback.data || readback.data.pqc_simulation !== true) { const logs = await writeState("blocked"); return { report, telemetry: "failed" as const, logs }; }
    const logs = await writeState("complete");
    return { report, telemetry: "stored" as const, seal, logs };
  });

export const recheckPrivateRepoDependencies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ repo: z.string().trim().min(3).max(300) }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { savePillarExecution } = await import("./pillar-logs.server");
    const { snapshotRepository } = await import("./audit-repository.server");
    const { repositoryFetchForUser } = await import("./github-repository.server");
    await savePillarExecution(context.supabase, context.userId, "syncing");
    try {
      const snapshot = await snapshotRepository(data.repo, undefined, await repositoryFetchForUser(context.userId));
      const logs = await savePillarExecution(context.supabase, context.userId, "simulation_active");
      return { status: "rechecked" as const, commit: snapshot.commit, dependencies: snapshot.dependencies, logs };
    } catch {
      const logs = await savePillarExecution(context.supabase, context.userId, "blocked");
      return { status: "blocked" as const, error: "Repository dependency verification failed. Check GitHub access. Hotfix blocked.", logs };
    }
  });