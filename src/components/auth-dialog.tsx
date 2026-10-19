import { useState, type FormEvent } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

type Mode = "sign-in" | "sign-up";

/**
 * Sign-in dialog backed by real Lovable Cloud auth:
 * one-tap Google sign-in plus classic email/password (with signup and
 * password reset). Confirmation-required signups land on a check-your-inbox
 * state instead of pretending the user is signed in.
 */
export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const google = async () => {
    if (pending) return;
    setPending(true);
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      toast.error("Sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 12000,
      });
    } finally {
      setPending(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      if (mode === "sign-up") {
        const { needsConfirmation } = await auth.signUpWithEmail(email.trim(), password);
        if (needsConfirmation) {
          setAwaitingConfirmation(true);
          return;
        }
        onOpenChange(false);
      } else {
        await auth.signInWithEmail(email.trim(), password);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(mode === "sign-up" ? "Sign-up failed" : "Sign-in failed", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 12000,
      });
    } finally {
      setPending(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first", {
        description: "Type the email you signed up with, then click Forgot password.",
      });
      return;
    }
    try {
      await auth.resetPassword(email.trim());
    } catch (error) {
      toast.error("Reset failed", {
        description: error instanceof Error ? error.message : "Please try again.",
        duration: 12000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-lg border-border bg-card p-6 sm:rounded-lg">
        {awaitingConfirmation ? (
          <div className="py-2 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-md border border-primary/40 bg-accent">
              <Mail className="size-5 text-primary" />
            </div>
            <DialogHeader className="mt-4 space-y-2 text-center sm:text-center">
              <DialogTitle className="text-foreground">Check your inbox</DialogTitle>
              <DialogDescription>
                We sent a confirmation link to <span className="text-foreground">{email}</span>.
                Click it to activate your account, then sign in here.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => {
                setAwaitingConfirmation(false);
                setMode("sign-in");
                setPassword("");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-2 text-left sm:text-left">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                {mode === "sign-in" ? "Sign in to API Sentinel" : "Create your account"}
              </DialogTitle>
              <DialogDescription>
                {mode === "sign-in"
                  ? "Access your monitoring command plane."
                  : "Start monitoring in under a minute."}
              </DialogDescription>
            </DialogHeader>

            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              disabled={pending}
              onClick={() => void google()}
            >
              <span
                aria-hidden
                className="grid size-4 place-items-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground"
              >
                G
              </span>
              Continue with Google
            </Button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                or email
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-3" onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password">Password</Label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
                      onClick={() => void forgot()}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="auth-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  disabled={pending}
                />
              </div>
              <Button type="submit" variant="sentinel" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />{" "}
                    {mode === "sign-up" ? "Creating account…" : "Signing in…"}
                  </>
                ) : mode === "sign-up" ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {mode === "sign-in" ? "New to API Sentinel?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-primary underline-offset-2 transition hover:underline"
                onClick={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  setPassword("");
                }}
              >
                {mode === "sign-in" ? "Create account" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
