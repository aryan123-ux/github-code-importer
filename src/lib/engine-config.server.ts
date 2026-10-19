// Secure configuration module for the API Sentinel engine.
//
// These values are READ ONLY on the server (never bundled to the browser) and
// are sourced from environment variables / the platform secret store. Nothing
// here should ever be hardcoded — add the real keys as project secrets named:
//
//   STRIPE_SECRET_KEY   — Stripe dashboard → Developers → API keys (sk_live_...)
//   ANTHROPIC_API_KEY   — console.anthropic.com → API keys (sk-ant-...)
//   GITHUB_WEBHOOK_SECRET — shared secret configured on the GitHub webhook
//
// Read env vars inside handlers (not at module scope): injection happens at
// call time in the serverless runtime.

export type EngineConfig = {
  stripeSecretKey: string;
  anthropicApiKey: string;
  githubWebhookSecret: string;
};

export type EngineConfigStatus = {
  key: keyof EngineConfig;
  envVar: string;
  configured: boolean;
};

const ENV_MAP: Record<keyof EngineConfig, string> = {
  stripeSecretKey: "STRIPE_SECRET_KEY",
  anthropicApiKey: "ANTHROPIC_API_KEY",
  githubWebhookSecret: "GITHUB_WEBHOOK_SECRET",
};

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/** Throws if a required key is missing — call this before any live API work. */
export function requireEngineConfig(): EngineConfig {
  const entries = Object.entries(ENV_MAP) as [keyof EngineConfig, string][];
  const missing = entries.filter(([, envVar]) => !read(envVar)).map(([, envVar]) => envVar);
  if (missing.length > 0) {
    throw new Error(`Missing required engine secrets: ${missing.join(", ")}`);
  }
  return Object.fromEntries(entries.map(([key, envVar]) => [key, read(envVar)!])) as EngineConfig;
}

/** Non-throwing introspection — safe to surface in health checks (no values). */
export function getEngineConfigStatus(): EngineConfigStatus[] {
  return (Object.entries(ENV_MAP) as [keyof EngineConfig, string][]).map(([key, envVar]) => ({
    key,
    envVar,
    configured: Boolean(read(envVar)),
  }));
}
