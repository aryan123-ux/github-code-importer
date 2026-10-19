import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, FlaskConical, LockKeyhole, Pause, Phone, PhoneOff, Play, Radio, RotateCcw, Satellite, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoreLabsRoadmap } from "@/components/CoreLabsRoadmap";

const nodes = Array.from({ length: 24 }, (_, i) => {
  const ring = i < 8 ? 0 : 1;
  const angle = ((i < 8 ? i : i - 8) / (ring ? 16 : 8)) * Math.PI * 2;
  return { x: 240 + Math.cos(angle) * (ring ? 170 : 82), y: 150 + Math.sin(angle) * (ring ? 118 : 62) };
});
const anomalyScores = [12, 18, 15, 31, 25, 48, 41, 63, 56, 72, 68, 84];
const providers = ["Stripe", "OpenAI", "Twilio"];

function AlertStatus({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-2 font-mono text-[10px] text-lab-alert"><span className="lab-blink size-1.5 rounded-full bg-lab-alert" />{children}</span>;
}

function TerminalHeader({ number, title, icon: Icon }: { number: string; title: string; icon: typeof Activity }) {
  return <header className="flex items-start gap-3 border-b border-lab-border p-5"><Icon className="mt-1 size-4 shrink-0 text-lab-alert" /><div className="min-w-0"><p className="mb-2 font-mono text-[9px] text-lab-muted">RESEARCH TERMINAL / {number}</p><h3 className="text-sm font-semibold leading-6 text-lab-text">{title}</h3></div></header>;
}

function AetherConsole() {
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 900);
    return () => window.clearInterval(timer);
  }, [running]);
  const active = tick % nodes.length;
  return <article className="lab-terminal">
    <TerminalHeader number="01" title="Project Aether: Neural-Network API Self-Healing Lattice" icon={Activity} />
    <div className="flex items-center justify-between px-5 pt-4"><AlertStatus>{running ? "RUNTIME MUTATION DETECTED" : "LATTICE PAUSED"}</AlertStatus><Button variant="ghost" size="icon" className="lab-control" aria-label={running ? "Pause lattice" : "Resume lattice"} title={running ? "Pause lattice" : "Resume lattice"} onClick={() => setRunning(!running)}>{running ? <Pause /> : <Play />}</Button></div>
    <div className="lab-grid relative mx-3 mt-3 overflow-hidden">
      <svg viewBox="0 0 480 300" className="block aspect-[8/5] w-full" role="img" aria-label="Animated runtime dependency lattice">
        <ellipse cx="240" cy="150" rx="204" ry="137" className="lab-orbit" />
        {nodes.map((node, i) => {
          const next = nodes[(i + 5 + tick % 3) % nodes.length];
          if (!next) return null;
          return <g key={i}><line x1={node.x} y1={node.y} x2={next.x} y2={next.y} className={cn("lab-link", (i === active || i === (active + 7) % 24) && "lab-link-active")} /><line x1="240" y1="150" x2={node.x} y2={node.y} className="lab-spoke" /><circle cx={node.x} cy={node.y} r={i === active ? 6 : 3} className={cn("lab-node", i === active && "lab-node-active")} /></g>;
        })}
        <circle cx="240" cy="150" r="24" className="lab-core" /><text x="240" y="153" textAnchor="middle" className="lab-svg-label">Æ / 01</text>
        <text x="16" y="24" className="lab-svg-caption">DEPENDENCY SPACE · 24 NODES</text><text x="16" y="282" className="lab-svg-caption">RUNTIME GENERATION / {String(tick).padStart(5, "0")}</text>
      </svg>
    </div>
    <div className="grid grid-cols-3 border-y border-lab-border px-5 py-4 font-mono"><Metric label="NODES" value="24" /><Metric label="GENERATIONS" value={String(1084 + tick)} /><Metric label="HEAL TIME" value={`${18 + tick % 6}ms`} /></div>
    <div className="lab-log"><p><span className="text-lab-muted">[runtime]</span> dependency/{String(active).padStart(2, "0")} → generated</p><p><span className="text-lab-alert">[repair]</span> compatibility edge reconstructed</p><p><span className="text-lab-muted">[verify]</span> simulated lattice integrity: nominal</p></div>
  </article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[8px] text-lab-muted">{label}</p><p className="mt-2 text-sm text-lab-text">{value}</p></div>;
}

function ChronoConsole() {
  const [month, setMonth] = useState(5);
  const [cycle, setCycle] = useState(0);
  const score = anomalyScores[month] ?? 0;
  return <article className="lab-terminal">
    <TerminalHeader number="02" title="Predictive Chrono-API Engine" icon={FlaskConical} />
    <div className="flex items-center justify-between px-5 pt-4"><AlertStatus>EXTERNAL DOC ANOMALIES</AlertStatus><Button variant="ghost" size="icon" className="lab-control" aria-label="Recalculate forecast" title="Recalculate forecast" onClick={() => setCycle((value) => value + 1)}><RotateCcw /></Button></div>
    <div className="lab-grid mx-3 mt-3">
      <svg viewBox="0 0 480 300" className="block aspect-[8/5] w-full" role="img" aria-label="12-month simulated documentation anomaly forecast">
        {[60, 110, 160, 210, 260].map((y, i) => <g key={y}><line x1="38" y1={y} x2="460" y2={y} className="lab-spoke" /><text x="10" y={y + 3} className="lab-svg-caption">{100 - i * 25}</text></g>)}
        <path d={`M ${anomalyScores.map((score, i) => `${40 + i * 37},${260 - (score + cycle % 4) * 2}`).join(" L ")}`} className="lab-forecast" />
        <line x1={40 + month * 37} y1="38" x2={40 + month * 37} y2="260" className="lab-selection" />
        {anomalyScores.map((score, i) => <circle key={i} cx={40 + i * 37} cy={260 - (score + cycle % 4) * 2} r={i === month ? 6 : 3} className={cn("lab-node", i === month && "lab-node-active")} />)}
        <text x="16" y="24" className="lab-svg-caption">ANOMALY INDEX / SYNTHETIC PROJECTION</text><text x="40" y="284" className="lab-svg-caption">T + 01</text><text x="416" y="284" className="lab-svg-caption">T + 12</text>
      </svg>
    </div>
    <div className="grid grid-cols-6 gap-1 border-y border-lab-border p-3" role="group" aria-label="Forecast month">
      {anomalyScores.map((_, i) => <Button key={i} variant="ghost" size="sm" aria-label={`Forecast month ${i + 1}`} aria-pressed={month === i} className={cn("lab-control h-7 px-0 font-mono text-[9px]", month === i && "lab-control-selected")} onClick={() => setMonth(i)}>M{String(i + 1).padStart(2, "0")}</Button>)}
    </div>
    <div className="lab-log" aria-live="polite"><p><span className="text-lab-muted">[horizon]</span> T + {month + 1} months / pass {cycle + 1}</p><p><span className="text-lab-alert">[anomaly]</span> {providers[month % 3]} · index {score + cycle % 4}/100</p><p><span className="text-lab-muted">[signal]</span> schema drift / documentation delta</p></div>
  </article>;
}

function TelecomConsole() {
  const [target, setTarget] = useState("+1 555 010 2048");
  const [elapsed, setElapsed] = useState(0);
  const [calling, setCalling] = useState(false);
  useEffect(() => {
    if (!calling) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [calling]);
  const status = !calling ? "STANDBY" : elapsed < 2 ? "ACQUIRING UPLINK" : "SIMULATED LINK ACTIVE";
  return <article className="lab-terminal">
    <TerminalHeader number="03" title="Autonomous AI Telecom Interceptor Console" icon={Satellite} />
    <div className="flex items-center justify-between px-5 pt-4"><AlertStatus>{status}</AlertStatus><Radio className="m-2 size-4 text-lab-muted" /></div>
    <div className="lab-grid relative mx-3 mt-3">
      <svg viewBox="0 0 480 300" className="block aspect-[8/5] w-full" role="img" aria-label="Simulated satellite network uplink and call waveform">
        {[40, 72, 104].map((r) => <circle key={r} cx="240" cy="143" r={r} className="lab-orbit" />)}
        <path d="M 125 78 L 240 143 L 356 68 M 240 143 L 151 215 M 240 143 L 355 211" className={cn("lab-link", calling && elapsed >= 2 && "lab-link-active")} />
        {([[125, 78], [356, 68], [151, 215], [355, 211]] as const).map(([x, y], i) => <g key={i}><rect x={x - 5} y={y - 5} width="10" height="10" className={cn("lab-node", calling && i === elapsed % 4 && "lab-node-active")} /><text x={x + 12} y={y + 3} className="lab-svg-caption">SAT / 0{i + 1}</text></g>)}
        <circle cx="240" cy="143" r="17" className="lab-core" />
        <path d={`M ${Array.from({ length: 70 }, (_, i) => `${16 + i * 6.5},${267 + (calling && elapsed >= 2 ? Math.sin(i * 1.7 + elapsed) * Math.sin(i * 0.4) * 13 : 0)}`).join(" L ")}`} className="lab-forecast" />
        <text x="16" y="24" className="lab-svg-caption">ORBITAL RELAY / SANDBOX NETWORK</text>
      </svg>
      <span className="absolute bottom-11 left-4 font-mono text-[9px] text-lab-muted">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")} / {calling ? `${42 + elapsed % 8}ms RTT` : "NO UPLINK"}</span>
    </div>
    <form className="flex gap-2 border-y border-lab-border p-3" onSubmit={(event) => { event.preventDefault(); setElapsed(0); setCalling(true); }}>
      <input type="tel" aria-label="Simulated telephone number" value={target} onChange={(event) => setTarget(event.target.value)} required maxLength={30} disabled={calling} className="min-w-0 flex-1 rounded-sm border border-lab-border bg-lab-surface px-3 font-mono text-xs text-lab-text outline-none focus:border-lab-alert" />
      {calling ? <Button type="button" variant="ghost" className="lab-control lab-control-selected" aria-label="End simulated call" title="End simulated call" onClick={(event) => { event.preventDefault(); setCalling(false); }}><PhoneOff /></Button> : <Button type="submit" variant="ghost" className="lab-control lab-control-selected" aria-label="Start simulated call" title="Start simulated call"><Phone /></Button>}
    </form>
    <div className="lab-log" aria-live="polite"><p><span className="text-lab-muted">[relay]</span> {calling ? (elapsed < 2 ? "satellite handshake pending" : `SAT / 0${elapsed % 4 + 1} · telemetry received`) : "4 virtual satellites available"}</p><p><span className="text-lab-alert">[scope]</span> synthetic call / no external connection</p><p><span className="text-lab-muted">[network]</span> {calling && elapsed >= 2 ? "packet integrity 99.8% / simulated" : "awaiting session"}</p></div>
  </article>;
}

export function CoreLabs() {
  return <section id="core-labs" className="core-labs my-10 scroll-mt-24 border-y border-lab-border bg-lab-background px-4 py-8 sm:px-6">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2 font-mono text-[10px] text-lab-muted"><LockKeyhole className="size-3 text-lab-alert" />CORE LABS / RESEARCH DIVISION</div><div className="flex items-center gap-2 border border-lab-border px-3 py-1.5 font-mono text-[9px] text-lab-muted"><TriangleAlert className="size-3 text-lab-alert" />CONCEPT SIMULATION · IP CLAIMS UNVERIFIED</div></div>
    <div className="mb-7 flex items-end justify-between gap-6"><h2 className="max-w-3xl text-2xl font-semibold leading-snug text-lab-text sm:text-3xl">API Sentinel Core Labs: <span className="text-lab-muted">Confidential $1B IP Assets (Patent-Pending)</span></h2><ArrowUpRight className="hidden size-8 shrink-0 text-lab-alert sm:block" /></div>
    <div className="grid items-stretch gap-4 lg:grid-cols-3"><AetherConsole /><ChronoConsole /><TelecomConsole /></div>
    <CoreLabsRoadmap />
    <div className="mt-5 flex flex-wrap justify-between gap-3 font-mono text-[9px] text-lab-muted"><span className="flex items-center gap-2"><span className="lab-blink size-1 rounded-full bg-lab-alert" />ISOLATED RESEARCH ENVIRONMENT</span><span>LOCAL SIMULATION / NO LIVE API OR TELECOM ACCESS</span></div>
  </section>;
}