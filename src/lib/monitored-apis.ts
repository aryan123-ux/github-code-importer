import { z } from "zod";

export const monitoredApiInput = z.object({
  name: z.string().trim().min(1, "Enter an API name.").max(100),
  endpoint_url: z.string().trim().max(2048).url("Enter a valid endpoint URL.").refine(value => {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  }, "Use an HTTP or HTTPS URL without credentials."),
  check_interval: z.number().int("Use whole seconds.").positive("Interval must be greater than zero."),
}).strict();