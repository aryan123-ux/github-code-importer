import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Hexagon, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — API Sentinel" },
      { name: "description", content: "Set a new password for your API Sentinel account." },
      { property: "og:title", content: "Reset password — API Sentinel" },
      {
        property: "og:description",
        content: "Set a new password for your API Sentinel account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

type Status = "checking" | "ready" | "invalid" | "saving" | "saved";

/**
 * Public password-reset page. Users land here from the recovery email link;
 * the Supabase client consumes the recovery session from the URL, then the
 * form calls updateUser({ password }) — no current password needed on a
 * recovery session.
 */
function ResetPassword() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const isRecovery = hash.get("type") === "recovery" || query.get("type") === "recovery";
    const hasToken = Boolean(hash.get("access_token") ?? query.get("access_token"));
    if (!isRecovery && !hasToken) {
      setStatus("invalid");
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? "ready" : "invalid");
    });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("ready");
      setError(updateError.message);
      return;
    }
    setStatus("saved");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm rounded-lg border-border bg-card/90 p-7 shadow-none">
        <div className="flex items-center gap-2.5">
          <div className="relative grid size-8 place-items-center">
            <Hexagon className="absolute size-8 text-primary" />
            <CheckCircle2 className="size-4 text-primary" />
          </div>
          <span className="text-sm font-extrabold tracking-wide">API SENTINEL</span>
        </div>

        {status === "checking" && (
          <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Verifying reset link…
          </p>
        )}

        {status === "invalid" && (
          <div className="mt-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning">
              <TriangleAlert className="size-4" /> Link invalid or expired
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This password-reset link is no longer valid. Request a new one from the sign-in
              dialog ("Forgot password?"), then try again.
            </p>
            <Button asChild variant="sentinel" className="mt-5 w-full">
              <Link to="/">Back to API Sentinel</Link>
            </Button>
          </div>
        )}

        {(status === "ready" || status === "saving" || status === "saved") && (
          <>
            <h1 className="mt-7 text-lg font-semibold text-foreground">Set a new password</h1>
            {status === "saved" ? (
              <div className="mt-4">
                <p className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="size-4" /> Password updated
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Your password has been changed. Sign in with your new password.
                </p>
                <Button asChild variant="sentinel" className="mt-5 w-full">
                  <Link to="/">Back to API Sentinel</Link>
                </Button>
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    disabled={status === "saving"}
                  />
                </div>
                {error && (
                  <p className="flex items-start gap-1.5 text-xs leading-5 text-destructive">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {error}
                  </p>
                )}
                <Button type="submit" variant="sentinel" className="w-full" disabled={status === "saving"}>
                  {status === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" /> Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            )}
          </>
        )}
      </Card>
    </main>
  );
}
