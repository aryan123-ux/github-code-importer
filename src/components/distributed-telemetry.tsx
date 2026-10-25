import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getPrivatePatchPulse } from "@/lib/patch-telemetry.functions";

export function DistributedTelemetry({ syncing, revision }: { syncing: boolean; revision: number }) {
  const { user } = useAuth();
  const fetchPulse = useServerFn(getPrivatePatchPulse);
  const owner = user?.id;
  const [state, setState] = useState<{ owner: string; pulse: Awaited<ReturnType<typeof getPrivatePatchPulse>>; failed: boolean } | null>(null);
  useEffect(() => {
    if (!owner) { setState(null); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const pulse = await fetchPulse();
        if (!cancelled) setState({ owner, pulse, failed: false });
      } catch { if (!cancelled) setState({ owner, pulse: null, failed: true }); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [owner, revision, fetchPulse]);
  const current = state?.owner === owner ? state : null;
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="leading-5 text-silver">&gt; One System Fixes, All Nodes Learn</p>
      <p className="text-[10px] uppercase text-muted-foreground">Private telemetry · Simulated training</p>
      <p className="flex items-start gap-2 leading-5 text-silver"><Lock className="mt-0.5 size-3.5 shrink-0" />🔒 Zero-Knowledge Data Isolation Active</p>
      <p className="text-muted-foreground">PQC Lattice Encrypted · ML-KEM-768 (CRYSTALS-Kyber)</p>
      {!owner ? <p className="leading-5 text-muted-foreground">Sign in for private patch telemetry.</p> : syncing ? (
        <p className="flex items-start gap-2 leading-5 text-silver"><Loader2 className="mt-0.5 size-3.5 shrink-0 motion-safe:animate-spin" />Syncing Patch Vector to Global Lattice...</p>
      ) : current?.failed ? <p className="leading-5 text-warning">Private telemetry unavailable. No training pulse confirmed.</p> : current?.pulse ? (
        <>
          <p className="flex items-start gap-2 leading-5 text-silver"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Distributed Meta-Learning Complete: All Node Frameworks Upgraded</p>
          <p className="text-muted-foreground">Simulation only · No frameworks changed</p>
          <p className="break-words text-muted-foreground">Abstract vector [{current.pulse.patch_vector.join(" · ")}]{current.pulse.pqc_simulation ? " · PQC-sealed (simulated)" : ""}</p>
        </>
      ) : <p className="leading-5 text-muted-foreground">Awaiting verified patch recommendation.</p>}
      <p className="text-muted-foreground">Owner-only pulse · No cross-tenant training</p>
    </div>
  );
}