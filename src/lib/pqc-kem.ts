// Genuine ML-KEM-768 (CRYSTALS-Kyber) encapsulation for abstract patch vectors.
// Pure-JS via @noble/post-quantum + WebCrypto AES-GCM: runs on the serverless
// runtime and in tests. Only coarse numeric vectors are ever sealed — no tenant
// code, paths, repo identifiers, or prompts cross this boundary.
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";

export type PqcKeypair = { publicKey: Uint8Array; secretKey: Uint8Array };
export type SealedVector = { kemCiphertext: string; vectorCiphertext: string };

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generatePqcKeypair(): PqcKeypair {
  const { publicKey, secretKey } = ml_kem768.keygen();
  return { publicKey, secretKey };
}

export async function sealVector(vector: number[], publicKey: Uint8Array): Promise<SealedVector> {
  if (vector.length !== 3 || vector.some(value => !Number.isInteger(value) || value < 0 || value > 3)) {
    throw new Error("Only abstract three-bucket patch vectors may be sealed.");
  }
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
  const key = await crypto.subtle.importKey("raw", new Uint8Array(sharedSecret), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(vector));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const packed = new Uint8Array(iv.length + encrypted.length);
  packed.set(iv);
  packed.set(encrypted, iv.length);
  return { kemCiphertext: bytesToBase64(cipherText), vectorCiphertext: bytesToBase64(packed) };
}

export async function openVector(sealed: SealedVector, secretKey: Uint8Array): Promise<number[]> {
  const sharedSecret = ml_kem768.decapsulate(base64ToBytes(sealed.kemCiphertext), secretKey);
  const key = await crypto.subtle.importKey("raw", new Uint8Array(sharedSecret), "AES-GCM", false, ["decrypt"]);
  const packed = base64ToBytes(sealed.vectorCiphertext);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.slice(0, 12) as Uint8Array<ArrayBuffer> }, key, packed.slice(12) as Uint8Array<ArrayBuffer>);
  const vector: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some(value => !Number.isInteger(value) || value < 0 || value > 3)) {
    throw new Error("Decapsulated payload is not a valid abstract patch vector.");
  }
  return vector;
}
