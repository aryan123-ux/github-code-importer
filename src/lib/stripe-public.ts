// Browser-safe Stripe config (publishable key only). Equivalent of NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
export const stripePublishableKey: string | undefined = import.meta.env[
  "VITE_STRIPE_PUBLISHABLE_KEY"
];
export const isStripeLive = Boolean(stripePublishableKey?.startsWith("pk_live_"));
