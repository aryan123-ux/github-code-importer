import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, BrainCircuit, LogIn, LogOut, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import { AuditScanner } from "@/components/audit-scanner";
import { DashboardPricing } from "@/components/dashboard-pricing";
import { DistributedTelemetry } from "@/components/distributed-telemetry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "API Sentinel — Free Code Audit Scanner" },
      {
        name: "description",
        content:
          "Preview a GitHub API code audit with API Sentinel, explore three deep-tech cores, and compare Startup and Enterprise plans.",
      },
      { property: "og:title", content: "API Sentinel — Free Code Audit Scanner" },
      {
        property: "og:description",
        content:
          "Preview a GitHub API code audit with API Sentinel, explore three deep-tech cores, and compare Startup and Enterprise plans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

function useTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-silver/40 bg-silver-glow/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-silver shadow-[0_0_12px_var(--silver-glow)]">
      <span className="signal-pulse size-1.5 rounded-full bg-silver" />
      {children}
    </span>
  );
}

function Pillar({
  index,
  icon,
  title,
  badge,
  children,
}: {
  index: string;
  icon: ReactNode;
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-silver/20 bg-terminal-panel">
      <header className="flex min-h-32 flex-wrap items-start justify-between gap-3 border-b border-silver/15 p-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md border border-silver/30 text-silver">
            {icon}
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
              PILLAR / {index}
            </p>
            <h2 className="mt-1 text-sm font-semibold leading-5 text-foreground">{title}</h2>
          </div>
        </div>
        <StatusBadge>{badge}</StatusBadge>
      </header>
      <div className="pillar-grid min-w-0 flex-1 p-5 font-mono text-xs text-silver">
        {children}
      </div>
    </section>
  );
}

const endpoints = ["stripe/v1", "openai/v1", "twilio/2010", "aws/sts", "github/rest", "slack/web"];

function MonitoringCore() {
  const tick = useTick(1500);
  return (
    <ul className="space-y-2">
      {endpoints.map((name, i) => {
        const latency = 40 + ((tick * 7 + i * 23) % 90);
        return (
          <li key={name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="signal-pulse size-1.5 rounded-full bg-silver" />
              {name}
            </span>
            <span className="text-muted-foreground">
              200 · <span className="text-silver">{latency}ms</span>
            </span>
          </li>
        );
      })}
      <li className="pt-3 text-muted-foreground">uptime 99.999% · scan #{1024 + tick}</li>
    </ul>
  );
}

function PqcLattice() {
  const tick = useTick(900);
  const hex = (n: number) => ((n * 2654435761) >>> 0).toString(16).padStart(8, "0");
  return (
    <div className="space-y-3">
      <p className="leading-5 text-silver">🔒 Post-Quantum Cryptography Enabled via CRYSTALS-Kyber</p>
      <dl className="space-y-1.5">
        {[
          ["KEM", "CRYSTALS-Kyber-1024"],
          ["SECURITY", "NIST Level 5"],
          ["HANDSHAKE", "hybrid X25519 + Kyber"],
          ["SESSION KEY", `${hex(tick)}…${hex(tick + 7)}`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-words text-right text-silver">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-8 gap-1 pt-2">
        {Array.from({ length: 32 }, (_, i) => (
          <span
            key={i}
            className={`h-2 rounded-[1px] ${(i + tick) % 5 === 0 ? "bg-silver" : "bg-terminal-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const auth = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [patchSync, setPatchSync] = useState(false);
  const [pulseRevision, setPulseRevision] = useState(0);

  return (
    <main className="min-h-screen text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-extrabold tracking-wide">
            <ShieldCheck className="size-5 text-silver" /> API SENTINEL
          </span>
          {auth.signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="terminal" size="sm" aria-label="Account menu">
                  {auth.displayName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{auth.email ?? auth.displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void auth.signOut()} className="text-destructive">
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="sentinel" size="sm" onClick={() => setAuthOpen(true)}>
              <LogIn /> Sign in
            </Button>
          )}
        </div>
      </header>

      {auth.authError && (
        <div className="border-b border-destructive/40 bg-destructive/10">
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs text-destructive sm:px-6">
            <TriangleAlert className="size-4" /> {auth.authError}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AuditScanner onPatchSync={(syncing, stored) => { setPatchSync(syncing); if (stored) setPulseRevision(value => value + 1); }} />
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-t border-silver/15 pt-7">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
              CORE SYSTEMS
            </p>
            <p className="mt-2 text-xl font-bold">Three cores. One sentinel.</p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Simulated telemetry · Research preview</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Pillar
            index="01"
            icon={<Activity className="size-4" />}
            title="24/7 Continuous API Surface Monitoring Core"
            badge="Live tracker"
          >
            <MonitoringCore />
          </Pillar>
          <Pillar
            index="02"
            icon={<ShieldCheck className="size-4" />}
            title="PQC Security Lattice"
            badge="Kyber"
          >
            <PqcLattice />
          </Pillar>
          <Pillar
            index="03"
            icon={<BrainCircuit className="size-4" />}
            title="Distributed Meta-Learning Self-Healing Core"
            badge="Learning"
          >
            <DistributedTelemetry syncing={patchSync} revision={pulseRevision} />
          </Pillar>
        </div>
        <DashboardPricing />
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </main>
  );
}
