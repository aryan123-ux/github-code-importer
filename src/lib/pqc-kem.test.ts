import { test } from "node:test";
import { strict as assert } from "node:assert";
import { base64ToBytes, bytesToBase64, generatePqcKeypair, openVector, sealVector } from "./pqc-kem";

test("ML-KEM-768 seal and open round-trips an abstract vector", async () => {
  const keypair = generatePqcKeypair();
  const sealed = await sealVector([3, 2, 1], keypair.publicKey);
  assert.notEqual(sealed.vectorCiphertext.includes("3,2,1"), true);
  assert.deepEqual(await openVector(sealed, keypair.secretKey), [3, 2, 1]);
});

test("a different secret key cannot open the vector", async () => {
  const keypair = generatePqcKeypair();
  const other = generatePqcKeypair();
  const sealed = await sealVector([1, 1, 1], keypair.publicKey);
  await assert.rejects(() => openVector(sealed, other.secretKey));
});

test("tampered ciphertext fails authenticated decryption", async () => {
  const keypair = generatePqcKeypair();
  const sealed = await sealVector([2, 0, 3], keypair.publicKey);
  const packed = base64ToBytes(sealed.vectorCiphertext);
  packed[packed.length - 1] ^= 1;
  await assert.rejects(() => openVector({ ...sealed, vectorCiphertext: bytesToBase64(packed) }, keypair.secretKey));
});

test("only abstract three-bucket vectors may be sealed", async () => {
  const keypair = generatePqcKeypair();
  await assert.rejects(() => sealVector([1, 2], keypair.publicKey));
  await assert.rejects(() => sealVector([1, 2, 4], keypair.publicKey));
  await assert.rejects(() => sealVector([1, 2, -1], keypair.publicKey));
});
