// ML-KEM-768 key management. Key material lives in public.pqc_keys, which is
// granted to service_role only — user sessions (anon/authenticated) can never
// read it. All access goes through the privileged server client, passed in by
// the caller after the caller has authenticated the user.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { base64ToBytes, bytesToBase64, generatePqcKeypair } from "./pqc-kem";

// Keys rotate lazily: the first seal/open after this age retires the active
// key (kept for decrypting older rows) and generates a fresh keypair.
export const PQC_KEY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function getActivePqcKey(admin: SupabaseClient<Database>): Promise<{ version: number; publicKey: Uint8Array }> {
  const { data, error } = await admin.from("pqc_keys")
    .select("key_version, public_key, created_at")
    .is("retired_at", null).order("key_version", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("PQC key lookup failed.");
  if (data && Date.now() - new Date(data.created_at).getTime() < PQC_KEY_MAX_AGE_MS) {
    return { version: data.key_version, publicKey: base64ToBytes(data.public_key) };
  }
  if (data) {
    await admin.from("pqc_keys").update({ retired_at: new Date().toISOString() }).eq("key_version", data.key_version);
  }
  const keypair = generatePqcKeypair();
  const nextVersion = (data?.key_version ?? 0) + 1;
  const { error: insertError } = await admin.from("pqc_keys").insert({
    key_version: nextVersion,
    public_key: bytesToBase64(keypair.publicKey),
    secret_key: bytesToBase64(keypair.secretKey),
  });
  if (insertError) throw new Error("PQC key rotation failed.");
  return { version: nextVersion, publicKey: keypair.publicKey };
}

export async function getPqcSecretKey(admin: SupabaseClient<Database>, version: number): Promise<Uint8Array> {
  const { data, error } = await admin.from("pqc_keys").select("secret_key").eq("key_version", version).single();
  if (error || !data) throw new Error("PQC key unavailable.");
  return base64ToBytes(data.secret_key);
}
