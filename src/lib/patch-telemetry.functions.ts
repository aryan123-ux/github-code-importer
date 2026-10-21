import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { abstractPatchVector } from "./patch-telemetry";

export const getPrivatePatchPulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("patch_telemetry")
      .select("id, created_at, patch_vector, simulation").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("Private telemetry unavailable.");
    return data;
  });

export const runPrivatePatchAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ repo: z.string().trim().min(3).max(300), commit: z.string().regex(/^[a-f0-9]{40}$/) }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { runVerifiedRepositoryAudit } = await import("./audit-repository.server");
    let report;
    try { report = await runVerifiedRepositoryAudit(data.repo, data.commit); }
    catch { return { report: { status: "blocked" as const, error: "Repository verification failed. Hotfix blocked." }, telemetry: "skipped" as const }; }
    const vector = abstractPatchVector(report);
    if (!vector) return { report, telemetry: "skipped" as const };
    // Identity comes exclusively from verified auth, never client input. RLS remains active.
    const { error } = await context.supabase.from("patch_telemetry").insert({ user_id: context.userId, patch_vector: vector, simulation: true });
    return { report, telemetry: error ? "failed" as const : "stored" as const };
  });