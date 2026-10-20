import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Github, Loader2, ScanLine, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recheckRepoDependencies, runRepoAudit, type AuditReport } from "@/lib/audit.functions";
import { parseGitHubRepository } from "@/lib/dashboard";

export function AuditScanner() {
  const [repo, setRepo] = useState("");
  const [scannedRepo, setScannedRepo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [stage, setStage] = useState<"rechecking" | "verifying" | null>(null);
  const [rechecked, setRechecked] = useState(false);
  const recheck = useServerFn(recheckRepoDependencies);
  const audit = useServerFn(runRepoAudit);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalized = parseGitHubRepository(repo);
    setReport(null);
    setStage(null);
    setRechecked(false);
    if (!normalized) {
      setError("Enter a GitHub repository URL or owner/repository.");
      return;
    }
    setError(null);
    setBusy(true);
    setStage("rechecking");
    setScannedRepo(normalized);
    try {
      const dependencyResult = await recheck({ data: { repo: normalized } });
      if (dependencyResult.status === "blocked") {
        setReport(dependencyResult);
        return;
      }
      setRechecked(true);
      setStage("verifying");
      setReport(await audit({ data: { repo: normalized, commit: dependencyResult.commit } }));
    } catch {
      setError("Repository verification couldn't finish. Hotfix blocked. Please try again.");
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <section aria-labelledby="scanner-title" className="pb-10 pt-3 sm:pb-12">
      <div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary">
        <ScanLine className="size-4" /> Repository intelligence <span className="ml-auto text-muted-foreground">Contract audit</span>
      </div>
      <h1 id="scanner-title" className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">1-Click Free Code Audit Scanner</h1>
      <p className="mt-3 text-sm text-muted-foreground">API Sentinel / GitHub repository audit</p>
      <form noValidate onSubmit={(event) => void submit(event)} className="mt-7">
        <label htmlFor="github-repository" className="mb-2 block font-mono text-xs text-silver">GITHUB REPOSITORY</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Github className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-silver" />
            <Input id="github-repository" value={repo} onChange={(event) => { setRepo(event.target.value); setError(null); }} placeholder="https://github.com/owner/repository" autoComplete="off" spellCheck={false} disabled={busy} aria-invalid={Boolean(error)} aria-describedby="audit-note audit-error" className="h-14 border-silver/25 bg-terminal-panel pl-12 pr-4 font-mono text-sm focus-visible:border-primary focus-visible:ring-primary" />
          </div>
          <Button type="submit" variant="sentinel" disabled={busy} className="audit-trigger h-14 px-6 font-semibold sm:min-w-56">
            {busy ? <Loader2 className="animate-spin" /> : <ScanLine />}
            {busy ? "Verifying repository…" : "Run Free API Audit"}
            {!busy && <ArrowRight />}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-silver" /> No sign-in required · No changes to your code</span>
          <span id="audit-note">Public repositories · npm lockfile + OpenAPI/Swagger</span>
        </div>
        <div aria-live="polite">
          {error && <p id="audit-error" role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive"><TriangleAlert className="size-4" />{error}</p>}
          {(busy || report) && <div role="status" className="mt-5 space-y-2 border-l border-silver/30 pl-4 font-mono text-xs text-silver">
            <p className="flex items-center gap-2">{stage === "rechecking" && <Loader2 className="size-3 animate-spin" />}Rechecking code matrix [Step 1/2]...{rechecked && <span className="text-muted-foreground">complete</span>}</p>
            {(rechecked || stage === "verifying") && <p className="flex items-center gap-2">{stage === "verifying" && <Loader2 className="size-3 animate-spin" />}Verifying endpoint integrity [Step 2/2]...{report?.status === "verified" && <span className="text-muted-foreground">2 passes complete</span>}</p>}
          </div>}
          {report && (
            <div className="mt-6 border-y border-silver/20 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">{report.status === "blocked" ? "Verification blocked" : "Final solution / Contract audit"}</h2><span className="font-mono text-[10px] uppercase text-warning">{report.status === "blocked" ? "No hotfix generated" : "Partial static coverage · Not a runtime guarantee"}</span></div>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{scannedRepo}</p>
              {report.status === "blocked" ? <p role="alert" className="mt-4 text-sm text-warning">{report.error}</p> : <>
                <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Commit {report.commit} · {report.dependencies} locked dependencies · {report.endpoints} static calls · {report.signaturePasses} signature passes</p>
                <ul className="mt-4 divide-y divide-border">
                  {report.findings.map((finding, index) => <li key={`${finding.file}-${index}`} className="py-3"><p className="break-words font-mono text-xs text-silver">{finding.file}:{finding.line} / {finding.method} {finding.path}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{finding.risk}</p></li>)}
                </ul>
                <p className="mt-3 text-sm leading-6 text-silver">{report.solution}</p>
              </>}
              <p className="mt-3 text-xs text-muted-foreground">No live endpoints were contacted and no pull request was created.</p>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}