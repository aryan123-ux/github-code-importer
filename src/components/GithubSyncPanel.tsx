import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, GitCommitHorizontal, Github, Loader2, RefreshCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGithubSyncStatus, type SyncStatus } from "@/lib/github-sync.functions";

declare const __BUILD_COMMIT__: string;
const BUILD_COMMIT = typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : "";
const STORAGE_KEY = "sentinel.github-repo";
const DEFAULT_REPO = (import.meta.env["VITE_GITHUB_REPO"] as string | undefined) ?? "";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function GithubSyncPanel() {
  const [repo, setRepo] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(target: string) {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getGithubSyncStatus({ data: { repo: target } }));
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Could not reach GitHub.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_REPO;
    if (saved) {
      setRepo(saved);
      setInput(saved);
      void load(saved);
    }
  }, []);

  function connect(e: React.FormEvent) {
    e.preventDefault();
    const clean = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$|\/+$/g, "");
    if (!clean) return;
    window.localStorage.setItem(STORAGE_KEY, clean);
    setRepo(clean);
    setInput(clean);
    void load(clean);
  }

  const upToDate = status && BUILD_COMMIT ? status.commit.sha === BUILD_COMMIT : null;

  return (
    <section id="github-sync" className="scroll-mt-24 py-10">
      <Card className="border-border bg-card/60 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-primary/30 bg-primary/10">
              <Github className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Source control
              </p>
              <h2 className="text-lg font-bold text-foreground">GitHub sync status</h2>
            </div>
          </div>
          {repo && (
            <Button variant="outline" size="sm" onClick={() => void load(repo)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          )}
        </div>

        <form onSubmit={connect} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="owner/repository or https://github.com/owner/repository"
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {repo ? "Change repository" : "Connect repository"}
          </Button>
        </form>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {status && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Repository</p>
              <a href={status.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 break-all font-semibold text-foreground hover:text-primary">
                {status.repo} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
              <p className="mt-1 font-mono text-xs text-muted-foreground">branch: {status.branch}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Latest synced commit</p>
              <a href={status.commit.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 font-mono text-sm text-primary hover:underline">
                <GitCommitHorizontal className="h-4 w-4" /> {status.commit.sha.slice(0, 7)}
              </a>
              <p className="mt-1 line-clamp-2 text-sm text-foreground">{status.commit.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status.commit.author} · {timeAgo(status.commit.date)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Project status</p>
              {upToDate === true && (
                <p className="mt-2 flex items-center gap-2 font-semibold text-primary">
                  <CheckCircle2 className="h-5 w-5" /> Up to date
                </p>
              )}
              {upToDate === false && (
                <p className="mt-2 flex items-center gap-2 font-semibold text-warning">
                  <TriangleAlert className="h-5 w-5" /> Out of sync
                </p>
              )}
              {upToDate === null && (
                <p className="mt-2 font-semibold text-muted-foreground">Unknown</p>
              )}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                this version: {BUILD_COMMIT ? BUILD_COMMIT.slice(0, 7) : "n/a"}
              </p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
