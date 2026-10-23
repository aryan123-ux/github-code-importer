import { createFileRoute } from "@tanstack/react-router";

// Public OAuth relay only: no credentials, database reads, or exchange here.
export const Route = createFileRoute("/api/public/github/return")({
  server: { handlers: { GET: ({ request }) => {
    const url = new URL(request.url);
    const result = { type: url.searchParams.get("success") === "true" ? "githubOAuthComplete" : "githubOAuthFailed",
      connectorId: url.searchParams.get("connector_id"), code: url.searchParams.get("code"), nonce: url.searchParams.get("nonce") };
    const json = JSON.stringify(result).replace(/</g, "\\u003c");
    const html = `<!doctype html><html><head><title>GitHub connection — API Sentinel</title></head><body><p>Returning to API Sentinel…</p><script>if(window.opener){window.opener.postMessage(${json},window.location.origin);}window.close();</script></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } } },
});