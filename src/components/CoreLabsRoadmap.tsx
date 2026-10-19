import { useEffect, useState } from "react";
import { GitPullRequest, Radar, Satellite } from "lucide-react";

function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return tick;
}

function Badge({ kind, children }: { kind: "active" | "alert"; children: React.ReactNode }) {
  const active = kind === "active";
  return <span className={`flex items-center gap-2 border px-2 py-1 font-mono text-[9px] ${active ? "border-lab-active/40 text-lab-active" : "border-lab-alert/40 text-lab-alert"}`}>
    <span className={`size-1.5 rounded-full ${active ? "lab-pulse-active bg-lab-active" : "lab-blink bg-lab-alert"}`} />{children}
  </span>;
}

function Card({ phase, title, icon: Icon, badge, children }: { phase: string; title: string; icon: typeof Radar; badge: React.ReactNode; children: React.ReactNode }) {
  return <article className="lab-terminal flex flex-col">
    <header className="flex items-start justify-between gap-3 border-b border-lab-border p-5">
      <div className="flex min-w-0 gap-3"><Icon className="mt-1 size-4 shrink-0 text-lab-muted" /><div><p className="mb-2 font-mono text-[9px] text-lab-muted">ROADMAP / {phase}</p><h3 className="text-sm font-semibold leading-6 text-lab-text">{title}</h3></div></div>
      {badge}
    </header>
    {children}
  </article>;
}

function ScanCard() {
  const tick = useTick(1200);
  const pct = [97, 99, 98, 100, 99][tick % 5] ?? 100;
  return <Card phase="PHASE 1" title="Phase 1: Diagnostic UI & Edge Analytics (100% Active)" icon={Radar} badge={<Badge kind="active">ACTIVE</Badge>}>
    <div className="lab-grid mx-3 mt-3 flex justify-center">
      <svg viewBox="0 0 200 200" className="block aspect-square w-full max-w-[240px]" role="img" aria-label="Mock scanning ring graph">
        {[30, 55, 80].map((r) => <circle key={r} cx="100" cy="100" r={r} className="lab-ring" />)}
        <circle cx="100" cy="100" r="80" className="lab-ring-active" strokeDasharray={`${(pct / 100) * 502} 502`} transform="rotate(-90 100 100)" />
        <g className="lab-sweep"><line x1="100" y1="100" x2="100" y2="22" stroke="var(--lab-active)" strokeWidth="1.5" opacity=".8" /></g>
        <text x="100" y="104" textAnchor="middle" className="lab-svg-label">{pct}%</text>
      </svg>
    </div>
    <div className="lab-log mt-auto"><p><span className="text-lab-muted">[edge]</span> 14 regions scanned · cycle {tick + 1}</p><p><span className="text-lab-active">[ok]</span> diagnostic UI online</p><p><span className="text-lab-muted">[note]</span> mock telemetry / demo data</p></div>
  </Card>;
}

const repos = ["core/api-gateway", "edge/router", "billing/service", "auth/session"];
function PatcherCard() {
  const tick = useTick(1500);
  const lines = Array.from({ length: 5 }, (_, i) => tick - i).filter((n) => n >= 0).map((n) => `PR #${1200 + n} → ${repos[n % 4]} · patch ${n % 3 === 0 ? "queued" : "simulated"}`);
  return <Card phase="PHASE 2" title="Phase 2: R&D Deep-Tech Patcher (Patent Filed)" icon={GitPullRequest} badge={<Badge kind="alert">PATENT FILED</Badge>}>
    <div className="lab-grid mx-3 mt-3 min-h-[200px] p-4 font-mono text-[10px] leading-6 text-lab-text">
      {lines.map((l, i) => <p key={l} className={i === 0 ? "text-lab-alert" : "text-lab-muted"}>$ {l}</p>)}
      <p className="text-lab-text">$ <span className="lab-blink inline-block h-3 w-1.5 bg-lab-alert align-middle" /></p>
    </div>
    <div className="lab-log mt-auto"><p><span className="text-lab-muted">[tracker]</span> {tick + 1} PR events observed</p><p><span className="text-lab-alert">[scope]</span> simulation only / no repo writes</p></div>
  </Card>;
}

const hooks = ["uplink.handshake", "relay.sync", "orbit.telemetry", "link.heal"];
function AetherCard() {
  const tick = useTick(1000);
  return <Card phase="PHASE 3" title="Phase 3: Project Aether - Quantum Self-Healing Network (Horizon)" icon={Satellite} badge={<Badge kind="alert">HORIZON</Badge>}>
    <div className="mx-3 mt-3 grid min-h-[200px] grid-cols-2 gap-2">
      {hooks.map((h, i) => {
        const on = tick % 4 === i;
        return <div key={h} className="lab-grid border border-lab-border p-3 font-mono">
          <p className="text-[8px] text-lab-muted">SAT / 0{i + 1}</p>
          <p className="mt-2 text-[10px] text-lab-text">{h}</p>
          <p className={`mt-3 text-[9px] ${on ? "text-lab-alert" : "text-lab-muted"}`}>{on ? "● FIRING" : `${40 + ((tick + i) % 9)}ms`}</p>
        </div>;
      })}
    </div>
    <div className="lab-log mt-auto"><p><span className="text-lab-muted">[hook]</span> {hooks[tick % 4]} → status received</p><p><span className="text-lab-alert">[horizon]</span> concept stage / simulated telemetry</p></div>
  </Card>;
}

export function CoreLabsRoadmap() {
  return <div className="mt-10">
    <p className="mb-4 font-mono text-[10px] text-lab-muted">3-PHASE TECHNOLOGY ROADMAP</p>
    <div className="grid items-stretch gap-4 lg:grid-cols-3"><ScanCard /><PatcherCard /><AetherCard /></div>
  </div>;
}
