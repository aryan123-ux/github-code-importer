import { parse } from "@babel/parser";
import { parse as parseYaml } from "yaml";

export type EndpointCall = { file: string; line: number; method: string; path: string; query: string[]; hasBody: boolean };
export type VerifiedEndpoint = EndpointCall & { deprecated: boolean };
export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function recheckDependencies(manifestText: string, first: string, second: string): number {
  if (first !== second) throw new Error("Dependency tree changed during re-check. Hotfix blocked.");
  const manifest = object(JSON.parse(manifestText));
  const lock = object(JSON.parse(first));
  const packages = object(lock?.packages);
  const root = object(packages?.[""]);
  if (!manifest || !packages || !root || ![2, 3].includes(Number(lock?.lockfileVersion))) throw new Error("A valid npm package-lock v2/v3 dependency tree is required. Hotfix blocked.");
  for (const group of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const declared = object(manifest[group]) ?? {};
    const locked = object(root[group]) ?? {};
    if (JSON.stringify(Object.entries(declared).sort()) !== JSON.stringify(Object.entries(locked).sort())) throw new Error("Manifest and dependency tree disagree. Hotfix blocked.");
    for (const name of Object.keys(declared)) {
      if (!object(packages[`node_modules/${name}`])) throw new Error("A declared dependency is unresolved. Hotfix blocked.");
    }
  }
  let count = 0;
  for (const [path, entry] of Object.entries(packages)) {
    if (!path) continue;
    const pkg = object(entry);
    if (!pkg || pkg.link === true || typeof pkg.version !== "string" || !pkg.version) throw new Error("Unresolved or linked dependency cannot be verified. Hotfix blocked.");
    count++;
  }
  if (!count) throw new Error("Dependency tree is empty. Hotfix blocked.");
  return count;
}

function literal(value: unknown): string | null {
  const node = object(value);
  if (node?.type === "StringLiteral" && typeof node.value === "string") return node.value;
  return null;
}
function properties(value: unknown): Record<string, unknown> {
  const node = object(value);
  if (!node) return {};
  if (node.type !== "ObjectExpression" || !Array.isArray(node.properties)) throw new Error("Dynamic endpoint options cannot be verified. Hotfix blocked.");
  const result: Record<string, unknown> = {};
  for (const raw of node.properties) {
    const prop = object(raw);
    const key = object(prop?.key);
    if (prop?.type !== "ObjectProperty" || prop.computed === true) throw new Error("Dynamic endpoint options cannot be verified. Hotfix blocked.");
    const name = key?.type === "Identifier" ? key.name : key?.value;
    if (typeof name !== "string") throw new Error("Invalid endpoint option. Hotfix blocked.");
    result[name] = prop.value;
  }
  return result;
}
export function extractEndpointCalls(file: string, source: string): EndpointCall[] {
  const ast = parse(source, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] });
  const calls: EndpointCall[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const node = object(value);
    if (!node) return;
    if (node.type === "CallExpression") {
      const callee = object(node.callee);
      const target = object(callee?.object);
      const member = object(callee?.property);
      const isFetch = callee?.type === "Identifier" && callee.name === "fetch";
      const isAxios = callee?.type === "MemberExpression" && target?.name === "axios";
      if (isFetch || isAxios) {
        const args = Array.isArray(node.arguments) ? node.arguments : [];
        const url = literal(args[0]);
        if (!url || (isAxios && (callee?.computed === true || typeof member?.name !== "string"))) throw new Error("Computed endpoint calls cannot be verified. Hotfix blocked.");
        if (!url.startsWith("/") && !/^https?:\/\//.test(url)) throw new Error("Endpoint base URL is unresolved. Hotfix blocked.");
        const parsed = new URL(url, "https://repository.invalid");
        const axiosMethod = String(member?.name ?? "").toUpperCase();
        const bodyMethod = ["POST", "PUT", "PATCH"].includes(axiosMethod);
        const options = properties(args[isFetch ? 1 : bodyMethod ? 2 : 1]);
        const method = isFetch ? (options.method ? literal(options.method)?.toUpperCase() : "GET") : axiosMethod;
        if (!method || !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(method)) throw new Error("Endpoint method cannot be verified. Hotfix blocked.");
        if (options.params) throw new Error("Axios query parameters require unsupported static analysis. Hotfix blocked.");
        const start = object(object(node.loc)?.start);
        calls.push({ file, line: Number(start?.line ?? 1), method, path: parsed.pathname, query: Array.from(parsed.searchParams.keys()).sort(), hasBody: isFetch ? Boolean(options.body) : bodyMethod && Boolean(args[1]) });
      }
    }
    for (const [key, child] of Object.entries(node)) if (!["loc", "start", "end", "comments", "tokens"].includes(key)) visit(child);
  }
  visit(ast);
  return calls;
}

export function verifyEndpointSignatures(calls: EndpointCall[], contractTexts: string[]): VerifiedEndpoint[] {
  if (!calls.length || !contractTexts.length) throw new Error("Endpoint calls and repository OpenAPI/Swagger contracts are required. Hotfix blocked.");
  const contracts = contractTexts.map(text => {
    const contract = object(parseYaml(text, { maxAliasCount: 50 }));
    if (!contract || (!String(contract.openapi ?? "").startsWith("3.") && contract.swagger !== "2.0") || !object(contract.paths)) throw new Error("Invalid repository API contract. Hotfix blocked.");
    // References need resolution; never silently treat unresolved schemas as verified.
    if (JSON.stringify(contract).includes('"$ref"')) throw new Error("Referenced API schemas are not supported yet. Hotfix blocked.");
    return contract;
  });
  return calls.map(call => {
    const matches: { item: Record<string, unknown>; operation: Record<string, unknown> }[] = [];
    for (const contract of contracts) {
      for (const [path, raw] of Object.entries(object(contract.paths) ?? {})) {
        const segments = path.split("/");
        const actual = call.path.split("/");
        if (segments.length !== actual.length || !segments.every((part, i) => /^\{[^{}]+\}$/.test(part) ? Boolean(actual[i]) : part === actual[i])) continue;
        const item = object(raw);
        const operation = object(item?.[call.method.toLowerCase()]);
        if (item && operation) matches.push({ item, operation });
      }
    }
    if (matches.length !== 1) throw new Error(`Endpoint ${call.method} ${call.path} has no unambiguous contract signature. Hotfix blocked.`);
    const match = matches[0];
    if (!match) throw new Error("Endpoint signature is missing. Hotfix blocked.");
    if (!object(match.operation.responses) || Object.keys(object(match.operation.responses) ?? {}).length === 0) throw new Error("Endpoint response signature is missing. Hotfix blocked.");
    const parameters = [...(Array.isArray(match.item.parameters) ? match.item.parameters : []), ...(Array.isArray(match.operation.parameters) ? match.operation.parameters : [])];
    for (const raw of parameters) {
      const param = object(raw);
      if (!param || typeof param.name !== "string") throw new Error("Invalid endpoint parameter signature. Hotfix blocked.");
      if (param.required === true && param.in === "query" && !call.query.includes(param.name)) throw new Error("Required endpoint query parameter is missing. Hotfix blocked.");
      if (param.required === true && !["path", "query", "body"].includes(String(param.in))) throw new Error("Required header or cookie cannot be verified. Hotfix blocked.");
      if (param.required === true && param.in === "body" && !call.hasBody) throw new Error("Required endpoint body is missing. Hotfix blocked.");
    }
    const body = object(match.operation.requestBody);
    if (body?.required === true && !call.hasBody) throw new Error("Required endpoint body is missing. Hotfix blocked.");
    if (body || parameters.some(raw => object(raw)?.in === "body")) throw new Error("Body schema validation is not supported yet. Hotfix blocked.");
    // Query schemas with constraints cannot be validated from key presence alone.
    if (parameters.some(raw => { const p = object(raw); return p?.in === "query" && (p.schema || p.type); })) throw new Error("Typed query validation is not supported yet. Hotfix blocked.");
    return { ...call, deprecated: match.operation.deprecated === true };
  });
}

export async function verifyTwice<T>(check: () => Promise<T>): Promise<T> {
  const first = await check();
  const second = await check();
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("Endpoint verification passes disagree. Hotfix blocked.");
  return second;
}

export async function verifiedSolution<T, R>(recheck: () => Promise<void>, verify: () => Promise<T>, generate: (evidence: T) => Promise<R>): Promise<R> {
  await recheck();
  return generate(await verifyTwice(verify));
}