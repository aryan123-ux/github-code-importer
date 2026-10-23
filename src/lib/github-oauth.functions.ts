import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GITHUB_GATEWAY, GITHUB_SCOPES } from "./github-access";

export const getGithubConnectionStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { getConnectionKeyForUser } = await import("./app-user-connections.server");
  return { connected: Boolean(await getConnectionKeyForUser(context.userId)) };
});

export const startGithubConnect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const clientAPIKey = process.env["GITHUB_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if (!clientAPIKey) throw new Error("GitHub authorization is not configured.");
  const request = getRequest();
  const url = new URL(request.url);
  const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  const origin = forwarded ? `https://${forwarded}` : url.origin;
  const nonce = crypto.randomUUID();
  const returnUrl = new URL("/api/public/github/return", origin);
  returnUrl.searchParams.set("nonce", nonce);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("github_oauth_attempts").insert({ nonce, user_id: context.userId });
  if (error) throw new Error("Could not start your GitHub connection.");
  const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
  const { getConnectionKeyForUser } = await import("./app-user-connections.server");
  const connectionAPIKey = await getConnectionKeyForUser(context.userId);
  const result = await authorizeAppUserOAuth({ gatewayBaseUrl: GITHUB_GATEWAY, connectorId: "github", appUserId: context.userId,
    clientAPIKey, returnUrl: returnUrl.toString(), connectionAPIKey: connectionAPIKey ?? undefined, credentialsConfiguration: { scopes: GITHUB_SCOPES } });
  return { authorizationUrl: result.authorizationUrl, nonce };
});

export const completeGithubConnection = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1).max(4096), nonce: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Consume an owner-bound, short-lived nonce before exchanging any code.
    const { data: attempt, error } = await supabaseAdmin.from("github_oauth_attempts").delete().eq("nonce", data.nonce)
      .eq("user_id", context.userId).gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString()).select("nonce").maybeSingle();
    if (error || !attempt) throw new Error("GitHub connection expired. Please try again.");
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("./app-user-connections.server");
    const result = await exchangeAppUserOAuthCode(GITHUB_GATEWAY, data.code);
    if (result.connectorId !== "github") throw new Error("Unexpected connection provider.");
    await saveConnectionKeyForUser(context.userId, result.connectionAPIKey);
    return { connected: true };
  });

export const recheckPrivateRepoDependencies = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ repo: z.string().trim().min(3).max(300) }).strict().parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { repositoryFetchForUser } = await import("./github-repository.server");
      const { snapshotRepository } = await import("./audit-repository.server");
      const snapshot = await snapshotRepository(data.repo, undefined, await repositoryFetchForUser(context.userId));
      return { status: "rechecked" as const, commit: snapshot.commit, dependencies: snapshot.dependencies, files: snapshot.files.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return { status: "blocked" as const, error: message.includes("Hotfix blocked") ? message : "Repository files could not be read. Hotfix blocked." };
    }
  });