import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Github,
  GitPullRequest,
  Globe2,
  Hexagon,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import { GithubSyncPanel } from "@/components/GithubSyncPanel";
import { CoreLabs } from "@/components/CoreLabs";
import { runRepoAudit, type AuditReport } from "@/lib/audit.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "API Sentinel — Autonomous API Monitoring" },
      {
        name: "description",
        content:
          "Monitor critical APIs, trace changelogs, and generate verified hotfixes from one command center.",
      },
      { property: "og:title", content: "API Sentinel — Autonomous API Monitoring" },
      {
        property: "og:description",
        content:
          "Monitor critical APIs, trace changelogs, and generate verified hotfixes from one command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type LogLine = { time: string; type: string; text: string; tone?: "warn" | "cyan" };

const initialLogs: LogLine[] = [
  { time: "04:58:11.092", type: "SCAN", text: "Crawler initialized · 24 endpoints queued" },
  { time: "04:58:11.408", type: "GET", text: "api.stripe.com/changelog → 200 · 128ms" },
  { time: "04:58:12.011", type: "DIFF", text: "No breaking changes detected · stripe/v2024-06" },
  {
    time: "04:58:12.634",
    type: "GET",
    text: "platform.openai.com/docs/changelog → 200 · 94ms",
    tone: "cyan",
  },
  { time: "04:58:13.205", type: "PARSE", text: "Schema fingerprint verified · sha256:8c4f...d901" },
];

const streamLogs: Omit<LogLine, "time">[] = [
  { type: "WATCH", text: "Tracking 4 provider changelog feeds" },
  { type: "GET", text: "docs.aws.amazon.com/apigateway/latest → 200 · 103ms" },
  { type: "DIFF", text: "Twilio Voice SDK · 2 additions detected", tone: "cyan" },
  { type: "VERIFY", text: "OpenAPI contract remains backward compatible" },
  { type: "INDEX", text: "Embedding changelog delta for semantic review" },
  { type: "SYNC", text: "Global monitor state committed · all regions green" },
];

type AuditPhase = "idle" | "scanning" | "done";
type AuditLine = { type: string; text: string };
type AuditState = { phase: AuditPhase; lines: AuditLine[]; repo: string; report?: AuditReport | undefined };

type PlanId = "pro" | "enterprise";
const PRICE_IDS: Record<PlanId, string> = {
  pro: import.meta.env["VITE_STRIPE_PRICE_PRO"] ?? "price_pro_monthly_499",
  enterprise: import.meta.env["VITE_STRIPE_PRICE_ENTERPRISE"] ?? "price_enterprise_monthly_899",
};
// External Stripe Payment Links. When set, plan buttons redirect straight to Stripe Checkout.
const PAYMENT_LINKS: Record<PlanId, string | undefined> = {
  pro: import.meta.env["VITE_STRIPE_PRO_PLAN_URL"] as string | undefined,
  enterprise: import.meta.env["VITE_STRIPE_ENTERPRISE_PLAN_URL"] as string | undefined,
};
const AUDIT_TOTAL_MS = 4000;
const AUDIT_STEP_MS = 1100;

const auditSequence: AuditLine[] = [
  { type: "SCANNING", text: "Cloned repo target into isolated memory space..." },
  { type: "AUDIT", text: "Parsing package.json and legacy API dependency trees..." },
  {
    type: "CRITICAL ALERT",
    text: "Found 2 deprecated Stripe webhook dependencies from 2024 schema!",
  },
];

const apiCards = [
  {
    name: "Stripe",
    mark: "S",
    endpoint: "api.stripe.com",
    latency: "128ms",
    uptime: "99.999%",
    calls: "18.4M",
    change: "+2.8%",
    bars: [43, 52, 47, 69, 58, 62, 74, 68, 77, 61, 82, 72],
  },
  {
    name: "OpenAI",
    mark: "O",
    endpoint: "api.openai.com",
    latency: "94ms",
    uptime: "99.997%",
    calls: "9.7M",
    change: "+6.1%",
    bars: [30, 44, 38, 52, 57, 48, 63, 71, 67, 74, 79, 83],
  },
  {
    name: "Twilio",
    mark: "T",
    endpoint: "api.twilio.com",
    latency: "161ms",
    uptime: "99.992%",
    calls: "6.2M",
    change: "+1.3%",
    bars: [51, 47, 61, 55, 72, 66, 59, 77, 70, 64, 75, 68],
  },
  {
    name: "AWS",
    mark: "A",
    endpoint: "api.aws.amazon.com",
    latency: "72ms",
    uptime: "100.00%",
    calls: "31.8M",
    change: "+4.9%",
    bars: [55, 61, 58, 64, 67, 72, 69, 78, 74, 81, 76, 86],
  },
];

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
          {eyebrow}
        </p>
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
      </div>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function ApiCard({ api, index }: { api: (typeof apiCards)[number]; index: number }) {
  return (
    <Card className="group overflow-hidden rounded-lg border-border bg-card/90 shadow-none transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_50px_var(--primary-glow)]">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md border border-border bg-secondary font-mono text-sm font-medium text-foreground">
              {api.mark}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{api.name}</h3>
              <p className="font-mono text-[10px] text-muted-foreground">{api.endpoint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <span className="signal-pulse size-1.5 rounded-full bg-primary" />
            Operational
          </div>
        </div>
        <div
          className="mt-7 flex h-14 items-end gap-1"
          aria-label={`${api.name} request volume chart`}
        >
          {api.bars.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[2px] bg-primary/20 transition-colors group-hover:bg-primary/45"
              style={{ height: `${height}%`, transitionDelay: `${i * 20}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        {[
          ["LATENCY", api.latency],
          ["UPTIME", api.uptime],
          ["24H CALLS", api.calls],
        ].map(([label, value]) => (
          <div className="px-3 py-4" key={label}>
            <p className="font-mono text-[9px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[11px]">
        <span className="text-muted-foreground">Requests vs. last week</span>
        <span className="font-mono text-primary">{api.change}</span>
      </div>
    </Card>
  );
}

function LiveTerminal({ audit }: { audit: AuditState }) {
  const [logs, setLogs] = useState(initialLogs);
  const [running, setRunning] = useState(true);
  const sequence = useRef(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const next = streamLogs[sequence.current % streamLogs.length];
      sequence.current += 1;
      if (!next) return;
      setLogs((current) => [
        ...current.slice(-7),
        { ...next, time: new Date().toISOString().slice(11, 23) },
      ]);
    }, 1700);
    return () => window.clearInterval(timer);
  }, [running]);
  return (
    <div className="relative overflow-hidden rounded-lg border border-terminal-border bg-terminal-panel shadow-[0_24px_80px_var(--primary-glow)]">
      <div className="flex items-center justify-between border-b border-terminal-border bg-terminal-muted/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-destructive" />
            <span className="size-2 rounded-full bg-warning" />
            <span className="size-2 rounded-full bg-primary" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            sentinel-daemon — live
          </span>
        </div>
        <Button
          variant="terminal"
          size="sm"
          onClick={() => setRunning((value) => !value)}
          aria-label={running ? "Pause log stream" : "Resume log stream"}
        >
          {running ? <Pause /> : <Play />} {running ? "PAUSE" : "RESUME"}
        </Button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-12 h-16 bg-primary/5 blur-md scan-line" />
      <div className="h-[340px] overflow-hidden p-5 font-mono text-[11px] leading-7 sm:text-xs">
        {audit.phase === "idle" ? (
          <>
            <div className="mb-3 text-terminal-bright">$ sentinel watch --all --deep-diff</div>
            {logs.map((log, i) => (
              <div
                key={`${log.time}-${i}`}
                className="grid grid-cols-[88px_48px_1fr] gap-2 border-b border-terminal-border/20 py-0.5"
              >
                <span className="text-muted-foreground">{log.time}</span>
                <span
                  className={
                    log.tone === "warn"
                      ? "text-warning"
                      : log.tone === "cyan"
                        ? "text-cyan"
                        : "text-terminal"
                  }
                >
                  {log.type}
                </span>
                <span className="truncate text-foreground/80">{log.text}</span>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2 text-terminal">
              <span className="inline-block h-4 w-1.5 animate-pulse bg-terminal" />
              {running ? "Awaiting upstream signal…" : "Stream paused"}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 break-all text-terminal-bright">
              $ sentinel audit --repo {audit.repo}
            </div>
            {audit.lines.map((line, i) => (
              <div
                key={`${line.type}-${i}`}
                className="grid grid-cols-[1fr] gap-2 border-b border-terminal-border/20 py-0.5 animate-fade-in sm:grid-cols-[150px_1fr]"
              >
                <span
                  className={cn(
                    "font-semibold",
                    line.type === "SCANNING" && "text-terminal",
                    line.type === "AUDIT" && "text-cyan",
                    line.type === "CRITICAL ALERT" && "text-destructive audit-flash",
                  )}
                >
                  [{line.type}]
                </span>
                <span className="text-foreground/80">{line.text}</span>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2 text-terminal">
              {audit.phase === "scanning" ? (
                <>
                  <span className="inline-block h-4 w-1.5 animate-pulse bg-terminal" />
                  Analyzing dependency graph…
                </>
              ) : (
                <>
                  <TriangleAlert className="size-4 text-warning" />
                  <span className="text-warning">Audit complete — 2 critical findings</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WorkflowPanel() {
  const [run, setRun] = useState(1);
  const [processing, setProcessing] = useState(false);
  const rerun = () => {
    setProcessing(true);
    window.setTimeout(() => {
      setRun((value) => value + 1);
      setProcessing(false);
    }, 1250);
  };
  const steps = [
    {
      icon: Github,
      label: "GitHub Actions",
      title: "Workflow failure",
      text: "tests/api-contract.yml · exit 1",
      tone: "warn",
    },
    {
      icon: Bot,
      label: "AI analysis",
      title: "Claude 3.5 Sonnet",
      text: "Root cause isolated · confidence 98.4%",
      tone: "cyan",
    },
    {
      icon: ShieldCheck,
      label: "Sentinel verification",
      title: "Shield Verified",
      text: "42 checks passed · zero regressions",
      tone: "green",
    },
    {
      icon: GitPullRequest,
      label: "Pull request",
      title: "fix/api-schema-guard",
      text: `PR #184${run} · ready to merge`,
      tone: "green",
    },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/90">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="size-4 text-primary" /> Autonomous remediation
        </div>
        <Button variant="ghost" size="sm" onClick={rerun} disabled={processing}>
          <RefreshCcw className={cn(processing && "animate-spin")} /> Replay
        </Button>
      </div>
      <div className="relative grid gap-0 p-5 lg:grid-cols-4">
        <div className="absolute left-[12%] right-[12%] top-11 hidden h-px bg-border lg:block">
          <div className="h-px w-full bg-primary/60" />
        </div>
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="relative flex gap-4 border-l border-border pb-6 pl-5 last:pb-0 lg:block lg:border-0 lg:px-3 lg:pb-0 lg:text-center"
          >
            <div
              className={cn(
                "relative z-10 grid size-11 shrink-0 place-items-center rounded-md border bg-secondary",
                step.tone === "warn"
                  ? "border-warning/50 text-warning"
                  : step.tone === "cyan"
                    ? "border-cyan/50 text-cyan"
                    : "border-primary/50 text-primary",
              )}
            >
              <step.icon className="size-5" />
            </div>
            <div className="lg:mt-5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                0{i + 1} / {step.label}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-primary/20 bg-accent/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="size-4" />
          <span>
            Median recovery time: <strong>47 seconds</strong>
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          SIGNED · SENTINEL-AUTO/{run}
        </span>
      </div>
    </div>
  );
}

type CheckoutPayload = {
  ok: boolean;
  sessionId?: string;
  redirectUrl?: string;
  priceId?: string;
  mode?: string;
  error?: string;
};

function Billing({ signedIn }: { signedIn: boolean }) {
  const [managed, setManaged] = useState(false);
  const [pending, setPending] = useState<PlanId | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const plans: { id: PlanId; name: string; price: string; tag: string; features: string[] }[] = [
    {
      id: "pro",
      name: "Pro",
      price: "$499",
      tag: "CURRENT PLAN",
      features: ["100 monitored endpoints", "Autonomous hotfix PRs", "14-day log retention"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "$899",
      tag: "SCALE",
      features: ["Unlimited endpoints", "Priority AI remediation", "90-day audit history"],
    },
  ];
  const startCheckout = async (plan: PlanId) => {
    const paymentLink = PAYMENT_LINKS[plan];
    if (paymentLink) {
      setPending(plan);
      window.location.href = paymentLink;
      return;
    }
    setPending(plan);
    setCheckout(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceId: PRICE_IDS[plan], plan }),
      });
      setCheckout((await response.json()) as CheckoutPayload);
    } catch {
      setCheckout({ ok: false, error: "Checkout service unreachable." });
    } finally {
      setPending(null);
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_.9fr]">
      {plans.map((plan, index) => (
        <Card
          key={plan.name}
          className={cn(
            "rounded-lg bg-card/90 p-5 shadow-none",
            index === 0 && "border-primary/50",
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{plan.name}</h3>
            <span
              className={cn(
                "font-mono text-[9px] tracking-widest",
                index === 0 ? "text-primary" : "text-cyan",
              )}
            >
              {plan.tag}
            </span>
          </div>
          <div className="my-5">
            <span className="text-3xl font-bold">{plan.price}</span>
            <span className="text-sm text-muted-foreground"> / month</span>
          </div>
          <ul className="space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-3.5 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            className="mt-6 w-full"
            variant={index === 0 ? "terminal" : "sentinel"}
            disabled={pending !== null}
            onClick={() => void startCheckout(plan.id)}
          >
            {pending === plan.id ? (
              <>
                <Loader2 className="animate-spin" /> Creating session…
              </>
            ) : index === 0 ? (
              "Renew Pro"
            ) : (
              "Upgrade plan"
            )}
          </Button>
          {checkout?.priceId === PRICE_IDS[plan.id] && (
            <div className="mt-3 break-all rounded-md border border-border bg-black/60 p-2.5 font-mono text-[10px] leading-4 whitespace-pre-line text-terminal">{`POST /api/checkout → ${checkout.mode}\nsession: ${checkout.sessionId}\nredirect: ${checkout.redirectUrl}`}</div>
          )}
        </Card>
      ))}
      <Card className="rounded-lg border-border bg-card/90 p-5 shadow-none">
        <div className="flex items-center justify-between">
          <div className="grid size-9 place-items-center rounded-md bg-secondary">
            <CreditCard className="size-4 text-primary" />
          </div>
          <span className="font-mono text-[9px] text-muted-foreground">BILLING PORTAL</span>
        </div>
        <h3 className="mt-5 font-semibold">Subscription control</h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {managed
            ? "Portal synced. Your plan renews Oct 22, 2026."
            : signedIn
              ? "Pro plan · Visa ending in 4242"
              : "Sign in to access billing controls."}
        </p>
        <div className="mt-6 rounded-md border border-border bg-secondary/60 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Next invoice</span>
            <span className="font-mono">$499.00</span>
          </div>
          <div className="mt-3 h-1 rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-primary" />
          </div>
        </div>
        <Button
          className="mt-5 w-full"
          variant="outline"
          disabled={!signedIn}
          onClick={() => setManaged(true)}
        >
          Manage subscription <ArrowUpRight />
        </Button>
      </Card>
    </div>
  );
}

function AuditScanner({
  audit,
  onScan,
  onReset,
}: {
  audit: AuditState;
  onScan: (repo: string) => void;
  onReset: () => void;
}) {
  const [repo, setRepo] = useState("");
  const scanning = audit.phase === "scanning";
  const done = audit.phase === "done";
  const findings = audit.report?.findings ?? [
    {
      pkg: "stripe@11.x",
      symbol: "webhook.constructEvent()",
      risk: "2024 webhook schema · payload fields removed — silent signature failure",
    },
    {
      pkg: "stripe@11.x",
      symbol: "invoice.payment_failed",
      risk: "2024 event shape deprecated · handler will throw on the new envelope",
    },
  ];
  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/35 bg-card/90 p-6 shadow-[0_0_70px_var(--primary-glow)] sm:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-md border border-primary/40 bg-accent">
            <Search className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
              Free 1-Click Code Audit Scanner
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Paste a public repository — we flag outdated API calls in seconds. No sign-up
              required.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
          <span className="signal-pulse size-1.5 rounded-full bg-primary" />
          Free audit
        </span>
      </div>
      <form
        className="relative mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (repo.trim() && !scanning) onScan(repo.trim());
        }}
      >
        <input
          value={repo}
          onChange={(event) => setRepo(event.target.value)}
          disabled={scanning}
          placeholder="Enter GitHub Repo URL"
          aria-label="GitHub repository URL"
          className="h-12 flex-1 rounded-md border border-input bg-secondary/60 px-4 font-mono text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:shadow-[0_0_24px_var(--primary-glow)] disabled:opacity-60"
        />
        <Button
          type="submit"
          variant="sentinel"
          size="lg"
          className="h-12 text-base shadow-[0_0_36px_var(--primary-glow)]"
          disabled={scanning || !repo.trim()}
        >
          {scanning ? (
            <>
              <Loader2 className="animate-spin" /> Auditing…
            </>
          ) : (
            <>
              <Zap /> Run Free API Audit
            </>
          )}
        </Button>
      </form>
      {done && (
        <div className="audit-flash relative mt-6 min-w-0 animate-fade-in rounded-lg border border-warning/60 bg-warning-muted/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <TriangleAlert className="size-5 shrink-0 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">RISK SUMMARY</h3>
              <span className="rounded-sm border border-destructive/60 bg-destructive/15 px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.18em] text-destructive">
                HIGH RISK
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span className="min-w-0 max-w-full break-all">{audit.repo}</span>
              <span className="shrink-0 whitespace-nowrap rounded-sm border border-warning/50 bg-warning-muted px-1.5 py-0.5 font-semibold text-warning">
                2 DEPRECATED DEPENDENCIES
              </span>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-border/60">
            {findings.map((finding) => (
              <li
                key={finding.symbol}
                className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="font-mono text-[10px] text-cyan sm:w-28 sm:shrink-0">
                  {finding.pkg}
                </span>
                <code className="w-fit max-w-full break-all rounded-sm bg-secondary px-2 py-0.5 font-mono text-xs text-warning sm:w-52 sm:shrink-0">
                  {finding.symbol}
                </code>
                <span className="min-w-0 text-xs leading-5 text-muted-foreground">
                  {finding.risk}
                </span>
              </li>
            ))}
          </ul>
          {audit.report && (
            <div className="mt-4 min-w-0 rounded-md border border-primary/30 bg-black/60 p-3 font-mono text-[10px] leading-4">
              <div className="flex flex-wrap items-center gap-2 text-primary">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>
                  PR #{audit.report.pr.number} · {audit.report.pr.branch}
                </span>
                <span className="text-muted-foreground">
                  {audit.report.source === "claude" ? "· generated by Claude" : "· simulated"}
                </span>
              </div>
              <div className="mt-1 break-words text-foreground">{audit.report.pr.title}</div>
              <pre className="mt-2 whitespace-pre-wrap break-all text-terminal">
                {audit.report.pr.diff}
              </pre>
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 border-t border-warning/30 pt-5 sm:flex-row sm:items-center">
            <Button
              asChild
              variant="sentinel"
              size="lg"
              className="h-auto min-h-11 whitespace-normal py-2.5 text-center text-base shadow-[0_0_36px_var(--primary-glow)]"
            >
              <a href="#billing">
                <Zap /> Automate Hotfix with API Sentinel Pro ($499/mo)
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRepo("");
                onReset();
              }}
            >
              Scan another repository
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Index() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

function Dashboard() {
  const auth = useAuth();
  const signedIn = auth.signedIn;
  const [audit, setAudit] = useState<AuditState>({ phase: "idle", lines: [], repo: "" });
  const auditTimers = useRef<number[]>([]);
  const auditRun = useRef(0);
  const startAudit = (repo: string) => {
    auditTimers.current.forEach((timer) => window.clearTimeout(timer));
    const run = ++auditRun.current;
    setAudit({ phase: "scanning", lines: [], repo });
    const reportPromise = runRepoAudit({ data: { repo } }).catch(() => undefined);
    const timerDone = new Promise<void>((resolve) => {
      auditTimers.current.push(window.setTimeout(resolve, AUDIT_TOTAL_MS));
    });
    auditTimers.current.push(
      ...auditSequence.map((line, i) =>
        window.setTimeout(
          () =>
            setAudit((current) => ({ ...current, lines: [...current.lines.slice(0, i), line] })),
          (i + 1) * AUDIT_STEP_MS,
        ),
      ),
    );
    void Promise.all([reportPromise, timerDone]).then(([report]) => {
      if (run !== auditRun.current) return;
      setAudit((current) => ({ ...current, phase: "done", report }));
    });
  };
  const resetAudit = () => {
    auditRun.current++;
    auditTimers.current.forEach((timer) => window.clearTimeout(timer));
    auditTimers.current = [];
    setAudit({ phase: "idle", lines: [], repo: "" });
  };
  const [authOpen, setAuthOpen] = useState(false);
  const wasSignedIn = useRef(signedIn);
  useEffect(() => {
    if (signedIn && !wasSignedIn.current) {
      window.requestAnimationFrame(() =>
        document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
    wasSignedIn.current = signedIn;
  }, [signedIn]);
  return (
    <main className="min-h-screen bg-background/95 text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="relative grid size-8 place-items-center">
              <Hexagon className="absolute size-8 text-primary" />
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <span className="text-sm font-extrabold tracking-wide">API SENTINEL</span>
            <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">
              v4.2
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-xs text-muted-foreground md:flex">
            <a href="#monitoring" className="transition hover:text-foreground">
              Monitoring
            </a>
            <a href="#terminal" className="transition hover:text-foreground">
              Live feed
            </a>
            <a href="#workflow" className="transition hover:text-foreground">
              AI remediation
            </a>
            <a href="#billing" className="transition hover:text-foreground">
              Billing
            </a>
          </nav>
          {signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="terminal" size="sm" aria-label="Account menu">
                  {auth.avatarUrl ? (
                    <img
                      src={auth.avatarUrl}
                      alt=""
                      className="size-4 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span aria-hidden className="text-[10px] font-bold">
                      {auth.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {auth.displayName} · Online
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{auth.displayName}</span>
                  {auth.email && (
                    <span className="truncate font-mono text-[10px] font-normal text-muted-foreground">
                      {auth.email}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void auth.signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="sentinel" size="sm" onClick={() => setAuthOpen(true)}>
              <LogIn />
              Sign in
            </Button>
          )}
        </div>
      </header>

      {auth.authError && (
        <div className="border-b border-destructive/40 bg-destructive/10">
          <div className="mx-auto flex max-w-[1480px] items-start gap-3 px-4 py-3 sm:px-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="flex-1 text-xs leading-5 text-destructive sm:text-sm">
              <span className="font-semibold">Sign-in needs attention: </span>
              {auth.authError}
            </p>
            <button
              type="button"
              onClick={auth.clearAuthError}
              aria-label="Dismiss sign-in error"
              className="shrink-0 rounded-sm px-1.5 text-sm leading-5 text-destructive/70 transition hover:text-destructive"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div id="top" className="mx-auto max-w-[1480px] px-4 pb-20 pt-8 sm:px-6">
        <section className="relative overflow-hidden border-b border-border pb-10 pt-5">
          <div className="absolute right-0 top-0 hidden font-mono text-[160px] font-bold leading-none text-primary/[0.025] xl:block">
            99.999
          </div>
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 border border-primary/25 bg-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                <Radio className="size-3" /> Global perimeter secure
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
                The control plane for{" "}
                <span className="text-glow text-primary">unstoppable APIs.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Monitor every dependency. Detect breaking changes before production. Ship
                AI-verified fixes in seconds.
              </p>
              {!signedIn && (
                  <Button
                    variant="sentinel"
                    size="lg"
                    className="mt-6"
                    onClick={() => setAuthOpen(true)}
                  >
                    <LogIn />
                    Sign in — Google or email
                  </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border lg:w-[420px]">
              {[
                ["ACTIVE MONITORS", "24"],
                ["EVENTS / SEC", "8.4K"],
                ["INCIDENTS", "0"],
              ].map(([label, value], i) => (
                <div key={label} className="bg-card p-4">
                  <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
                  <p className={cn("mt-2 text-xl font-bold", i === 2 && "text-primary")}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="scanner" className="scroll-mt-24">
          {signedIn && (
            <div className="mt-8 flex justify-center">
              <span className="signal-pulse inline-flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span aria-hidden>🔒</span> Securely Connected
              </span>
            </div>
          )}
          <AuditScanner audit={audit} onScan={startAudit} onReset={resetAudit} />
        </div>

        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

        <GithubSyncPanel />

        <CoreLabs />

        <section
          id="monitoring"
          className={cn(
            "scroll-mt-24 py-10 transition-all duration-500",
            audit.phase === "scanning" && "pointer-events-none select-none opacity-40 blur-[1.5px]",
          )}
        >
          <SectionTitle
            eyebrow="01 / Perimeter"
            title="Critical API surface"
            detail="Live health, latency, and request telemetry across every external dependency."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {apiCards.map((api, index) => (
              <ApiCard key={api.name} api={api} index={index} />
            ))}
          </div>
        </section>

        <section id="terminal" className="scroll-mt-24 py-10">
          <SectionTitle
            eyebrow="02 / Intelligence feed"
            title="Live Matrix terminal"
            detail="Continuous semantic scraping, schema fingerprinting, and compatibility analysis."
          />
          <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
            <LiveTerminal audit={audit} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="rounded-lg bg-card/90 p-5 shadow-none">
                <div className="flex items-center justify-between">
                  <Search className="size-5 text-cyan" />
                  <span className="font-mono text-[9px] text-muted-foreground">CRAWL MATRIX</span>
                </div>
                <p className="mt-6 text-4xl font-bold">12,408</p>
                <p className="mt-1 text-xs text-muted-foreground">pages indexed this cycle</p>
                <div className="mt-6 flex items-end gap-1">
                  {[35, 66, 48, 82, 60, 91, 72, 84, 58, 78, 96, 81].map((h, i) => (
                    <span key={i} className="flex-1 bg-cyan/40" style={{ height: `${h / 2}px` }} />
                  ))}
                </div>
              </Card>
              <Card className="rounded-lg bg-card/90 p-5 shadow-none">
                <div className="flex items-center justify-between">
                  <Activity className="size-5 text-primary" />
                  <span className="font-mono text-[9px] text-muted-foreground">DETECTION SLO</span>
                </div>
                <p className="mt-6 text-4xl font-bold">
                  3.8<span className="text-lg text-muted-foreground">s</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">mean change detection</p>
                <div className="mt-6 space-y-2">
                  {[
                    ["Fetch", "0.9s"],
                    ["Diff", "1.7s"],
                    ["Verify", "1.2s"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between font-mono text-[10px]">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="text-primary">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className={cn(
            "scroll-mt-24 py-10 transition-all duration-500",
            audit.phase === "scanning" && "pointer-events-none select-none opacity-40 blur-[1.5px]",
          )}
        >
          <SectionTitle
            eyebrow="03 / Autonomous response"
            title="Failure to verified fix"
            detail="A closed-loop remediation path from CI failure to a review-ready pull request."
          />
          <WorkflowPanel />
        </section>

        <section
          id="billing"
          className={cn(
            "scroll-mt-24 py-10 transition-all duration-500",
            audit.phase === "scanning" && "pointer-events-none select-none opacity-40 blur-[1.5px]",
          )}
        >
          <SectionTitle
            eyebrow="04 / Command access"
            title="Scale your perimeter"
            detail="Production-grade monitoring for teams that cannot afford an invisible breaking change."
          />
          <Billing signedIn={signedIn} />
        </section>
      </div>

      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-4 text-primary" />
            <span>API Sentinel command plane</span>
            <span className="font-mono text-primary">ALL SYSTEMS NOMINAL</span>
          </div>
          <div className="flex gap-5">
            <span className="flex items-center gap-1.5">
              <Globe2 className="size-3" /> 12 regions
            </span>
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-3" /> SOC 2 TYPE II
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3" /> 2026
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
