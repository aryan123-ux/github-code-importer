import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { abstractPatchVector } from "./patch-telemetry";

export const getPrivatePatchPulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("patch_telemetry")
      .select("id, created_at, patch_vector, simulation, pqc_simulation, key_version, kem_ciphertext, vector_ciphertext")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("Private telemetry unavailable.");
    if (data?.key_version && data.kem_ciphertext && data.vector_ciphertext) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getPqcSecretKey } = await import("./pqc-kem.server");
        const { openVector } = await import("./pqc-kem");
        const secretKey = await getPqcSecretKey(supabaseAdmin, data.key_version);
        const vector = await openVector({ kemCiphertext: data.kem_ciphertext, vectorCiphertext: data.vector_ciphertext }, secretKey);
        return { id: data.id, created_at: data.created_at, patch_vector: vector, simulation: data.simulation, pqc_simulation: false, key_version: data.key_version };
      } catch {
        throw new Error("Private telemetry unavailable.");
      }
    }
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
    // Genuine ML-KEM-768 encapsulation: only the coarse abstract vector is
    // sealed; raw code, paths, and repo identifiers never leave the audit.
    let sealed: { kemCiphertext: string; vectorCiphertext: string };
    let keyVersion: number;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getActivePqcKey } = await import("./pqc-kem.server");
      const { sealVector } = await import("./pqc-kem");
      const key = await getActivePqcKey(supabaseAdmin);
      sealed = await sealVector(vector, key.publicKey);
      keyVersion = key.version;
    } catch {
      const logs = await writeState("blocked");
      return { report, telemetry: "failed" as const, logs };
    }
    // Identity comes exclusively from verified auth, never client input. RLS remains active.
    const { data: pulse, error } = await context.supabase.from("patch_telemetry").insert({
      user_id: context.userId,
      patch_vector: null,
      kem_ciphertext: sealed.kemCiphertext,
      vector_ciphertext: sealed.vectorCiphertext,
      key_version: keyVersion,
      simulation: true,
      pqc_simulation: false,
    }).select("id").single();
    if (error || !pulse) { const logs = await writeState("blocked"); return { report, telemetry: "failed" as const, logs }; }
    const readback = await context.supabase.from("patch_telemetry").select("id, kem_ciphertext, vector_ciphertext").eq("id", pulse.id).eq("user_id", context.userId).single();
    if (readback.error || !readback.data?.kem_ciphertext || !readback.data.vector_ciphertext) { const logs = await writeState("blocked"); return { report, telemetry: "failed" as const, logs }; }
    // Confirm the stored row decapsulates back to the exact vector before reporting stored.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getPqcSecretKey } = await import("./pqc-kem.server");
      const { openVector } = await import("./pqc-kem");
      const secretKey = await getPqcSecretKey(supabaseAdmin, keyVersion);
      const opened = await openVector({ kemCiphertext: readback.data.kem_ciphertext, vectorCiphertext: readback.data.vector_ciphertext }, secretKey);
      if (opened.join(",") !== vector.join(",")) throw new Error("round-trip mismatch");
    } catch {
      const logs = await writeState("blocked");
      return { report, telemetry: "failed" as const, logs };
    }
    const logs = await writeState("complete");
    return { report, telemetry: "stored" as const, keyVersion, logs };
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
