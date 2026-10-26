import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  plan: string;
};

type AuthValue = {
  user: User | null;
  signedIn: boolean;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  plan: string;
  /** Last sign-in failure, translated into actionable guidance. Null when healthy. */
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Translate raw auth errors into guidance the user can act on.
 * Covers the most common failures: wrong credentials, unconfirmed email,
 * duplicate signup, weak password, and rate limits.
 */
function describeAuthError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "That email and password combination doesn't match an account. Check your password, or switch to Create account.";
  }
  if (msg.includes("email not confirmed")) {
    return "This account hasn't been confirmed yet. Click the confirmation link in the email we sent you, then sign in.";
  }
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this email already exists. Switch to Sign in instead.";
  }
  if (msg.includes("password") && (msg.includes("short") || msg.includes("at least") || msg.includes("length"))) {
    return "Passwords must be at least 8 characters. Try a longer one.";
  }
  if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("429")) {
    return "Too many attempts in a short time. Wait a minute and try again.";
  }
  if (msg.includes("valid email") || msg.includes("invalid email") || msg.includes("unable to validate")) {
    return "That email address doesn't look valid. Double-check it and try again.";
  }
  if (msg.includes("same password")) {
    return "The new password must be different from the current one.";
  }
  return raw;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  /** Load the signed-in user's profile row; create one if the trigger missed it. */
  const loadProfile = async (currentUser: User) => {
    const meta = (currentUser.user_metadata ?? {}) as Record<string, unknown>;
    const fallbackName =
      (meta["full_name"] as string | undefined) ??
      (meta["name"] as string | undefined) ??
      currentUser.email?.split("@")[0] ??
      "Operator";
    const fallbackAvatar = (meta["avatar_url"] as string | undefined) ?? null;

    const existing = await supabase
      .from("profiles")
      .select("display_name, avatar_url, plan")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (existing.data) {
      setProfile(existing.data as ProfileRow);
      return;
    }
    const created = await supabase
      .from("profiles")
      .upsert({
        id: currentUser.id,
        display_name: fallbackName,
        avatar_url: fallbackAvatar,
      })
      .select("display_name, avatar_url, plan")
      .single();
    if (created.data) setProfile(created.data as ProfileRow);
  };

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) void loadProfile(data.user);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (session?.user) void loadProfile(session.user);
      else setProfile(null);
      void router.invalidate();
      if (event === "SIGNED_OUT") queryClient.clear();
      else void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthValue = {
    user,
    signedIn: Boolean(user),
    displayName:
      profile?.display_name ??
      (user?.user_metadata?.["full_name"] as string | undefined) ??
      (user?.user_metadata?.["name"] as string | undefined) ??
      user?.email?.split("@")[0] ??
      "Operator",
    email: user?.email ?? null,
    avatarUrl:
      profile?.avatar_url ??
      (user?.user_metadata?.["avatar_url"] as string | undefined) ??
      null,
    plan: profile?.plan ?? "free",
    authError,
    clearAuthError: () => setAuthError(null),
    signInWithGoogle: async () => {
      setAuthError(null);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const guidance = describeAuthError(result.error.message);
        setAuthError(guidance);
        toast.error("Sign-in failed", { description: guidance, duration: 12000 });
        return;
      }
      // result.redirected: the browser is heading to Google; onAuthStateChange
      // picks the session up when the flow returns.
    },
    signUpWithEmail: async (email, password) => {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        const guidance = describeAuthError(error.message);
        setAuthError(guidance);
        throw new Error(guidance);
      }
      // With email confirmation on, session is null until the user clicks the
      // confirmation link — never treat signup as signed-in.
      return { needsConfirmation: data.session === null };
    },
    signInWithEmail: async (email, password) => {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const guidance = describeAuthError(error.message);
        setAuthError(guidance);
        throw new Error(guidance);
      }
    },
    resetPassword: async (email) => {
      setAuthError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        const guidance = describeAuthError(error.message);
        setAuthError(guidance);
        throw new Error(guidance);
      }
      toast.success("Reset link sent", {
        description: `Check ${email} for a link to set a new password.`,
      });
    },
    signOut: async () => {
      setAuthError(null);
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
