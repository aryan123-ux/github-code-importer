import { test } from "node:test";
import { strict as assert } from "node:assert";
import { monitoredApiInput } from "./monitored-apis";

test("API inputs preserve name, endpoint URL and check interval", () => {
  assert.deepEqual(monitoredApiInput.parse({ name: " Payments ", endpoint_url: "https://example.com/health", check_interval: 60 }), { name: "Payments", endpoint_url: "https://example.com/health", check_interval: 60 });
});
test("interval uses positive whole seconds", () => {
  for (const check_interval of [0, -1, 1.5]) assert.equal(monitoredApiInput.safeParse({ name: "API", endpoint_url: "https://example.com", check_interval }).success, false);
});
test("endpoint rejects embedded secrets and non HTTP protocols", () => {
  for (const endpoint_url of ["https://user:password@example.com", "file:///etc/passwd", "invalid"]) assert.equal(monitoredApiInput.safeParse({ name: "API", endpoint_url, check_interval: 60 }).success, false);
});