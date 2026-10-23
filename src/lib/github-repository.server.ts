import { callAsAppUser, appUserReconnectRequired } from "@/integrations/lovable/appUserConnector";
import { getConnectionKeyForUser } from "./app-user-connections.server";
import { GITHUB_GATEWAY, GITHUB_SCOPES, githubRequestPath } from "./github-access";

export async function repositoryFetchForUser(userId: string) {
  const connectionAPIKey = await getConnectionKeyForUser(userId);
  if (!connectionAPIKey) return undefined; // Explicit public-only access; never a workspace token.
  return async (url: string, init: RequestInit): Promise<Response> => {
    const { path, raw } = githubRequestPath(url);
    const response = await callAsAppUser({ gatewayBaseUrl: GITHUB_GATEWAY, connectorId: "github", connectionAPIKey, path,
      requiredScopes: GITHUB_SCOPES, init: { ...init, headers: { Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json" } } });
    if (await appUserReconnectRequired(response)) throw new Error("Reconnect GitHub to renew repository access. Hotfix blocked.");
    if (!response.ok) throw new Error(`GitHub repository access failed (${response.status}). Check permissions or quota. Hotfix blocked.`);
    return response;
  };
}