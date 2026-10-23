import { decryptConnectionKey, encryptConnectionKey } from "./connection-key-crypto.server";

export async function getConnectionKeyForUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("app_user_connections")
    .select("connection_key_ciphertext").eq("user_id", userId).eq("connector_id", "github").maybeSingle();
  if (error) throw new Error("GitHub connection unavailable.");
  return data ? decryptConnectionKey(data.connection_key_ciphertext) : null;
}

export async function saveConnectionKeyForUser(userId: string, connectionAPIKey: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("app_user_connections").upsert({
    user_id: userId, connector_id: "github", connection_key_ciphertext: encryptConnectionKey(connectionAPIKey), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,connector_id" });
  if (error) throw new Error("Could not save your GitHub connection.");
}