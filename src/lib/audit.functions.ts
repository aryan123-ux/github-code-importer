import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AuditFinding = { pkg: string; symbol: string; risk: string };
export type AuditReport = {
  source: "claude" | "simulated";
  findings: AuditFinding[];
  pr: { number: number; title: string; branch: string; diff: string };
};

const FALLBACK: Omit<AuditReport, "source"> = {
  findings: [
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
  ],
  pr: {
    number: 1842,
    title: "fix(billing): migrate Stripe webhooks to 2025 event schema",
    branch: "sentinel/hotfix-stripe-webhooks",
    diff: "- stripe.webhooks.constructEvent(body, sig, secret)\n+ stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider)",
  },
};

const ReportSchema = z.object({
  findings: z
    .array(
      z.object({ pkg: z.string().max(80), symbol: z.string().max(120), risk: z.string().max(240) }),
    )
    .min(1)
    .max(4),
  pr: z.object({
    number: z.number().int(),
    title: z.string().max(140),
    branch: z.string().max(100),
    diff: z.string().max(600),
  }),
});

// Runs the audit on the server. The Anthropic key stays private (ANTHROPIC_API_KEY secret).
export const runRepoAudit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ repo: z.string().trim().min(3).max(300) }).parse(data),
  )
  .handler(async ({ data }): Promise<AuditReport> => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) return { source: "simulated", ...FALLBACK };
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env["ANTHROPIC_MODEL"] ?? "claude-3-5-sonnet-latest",
          max_tokens: 800,
          system:
            "You are API Sentinel, an API-deprecation auditor. Reply with ONLY minified JSON: " +
            '{"findings":[{"pkg":"name@ver","symbol":"method()","risk":"short risk"}],' +
            '"pr":{"number":1234,"title":"fix: ...","branch":"sentinel/...","diff":"- old\\n+ new"}}. ' +
            "Give exactly 2 plausible deprecated Stripe/OpenAI/Twilio API findings and one hotfix PR.",
          messages: [{ role: "user", content: `Simulate a telemetry audit of ${data.repo}` }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const json = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = json.content?.find((c) => c.type === "text")?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = ReportSchema.parse(JSON.parse(match ? match[0] : text));
      return { source: "claude", ...parsed };
    } catch (error) {
      console.error("Audit fell back to simulation:", error);
      return { source: "simulated", ...FALLBACK };
    }
  });
