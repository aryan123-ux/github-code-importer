import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getEngineConfigStatus } from "@/lib/engine-config.server";

const CheckoutInput = z.object({
  priceId: z
    .string()
    .min(3)
    .max(120)
    .regex(/^price_[A-Za-z0-9_]+$/),
  plan: z.enum(["pro", "enterprise"]),
});

// Mock checkout endpoint. Returns the same shape a real Stripe Checkout
// session handler would, so the frontend can switch to live keys unchanged.
export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = CheckoutInput.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Invalid checkout request." }, { status: 400 });
        }
        const live =
          getEngineConfigStatus().find((s) => s.envVar === "STRIPE_SECRET_KEY")?.configured ??
          false;
        const sessionId = `cs_${live ? "live" : "test"}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        return Response.json({
          ok: true,
          mode: live ? "live" : "simulated",
          plan: parsed.data.plan,
          priceId: parsed.data.priceId,
          sessionId,
          redirectUrl: `https://checkout.stripe.com/c/pay/${sessionId}`,
        });
      },
    },
  },
});
