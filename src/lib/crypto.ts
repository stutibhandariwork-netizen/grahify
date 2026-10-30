import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

/**
 * Field-level encryption for personal data (birth details, charts, readings, journals).
 * Format: [version=1][12-byte IV][16-byte GCM tag][ciphertext].
 */

const VERSION = 1;

function masterKey(): Buffer {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

function subkey(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", masterKey(), Buffer.alloc(0), `grahify:${purpose}`, 32));
}

export function encrypt(plaintext: string): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", subkey("data"), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const out = Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), body]);
  return new Uint8Array(out);
}

export function decrypt(data: Uint8Array): string {
  const buf = Buffer.from(data);
  if (buf[0] !== VERSION) throw new Error(`Unknown ciphertext version ${buf[0]}`);
  const decipher = createDecipheriv("aes-256-gcm", subkey("data"), buf.subarray(1, 13));
  decipher.setAuthTag(buf.subarray(13, 29));
  return Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()]).toString("utf8");
}

export const encryptJson = (value: unknown) => encrypt(JSON.stringify(value));
export const decryptJson = <T>(data: Uint8Array): T => JSON.parse(decrypt(data)) as T;

/** Keyed hash for lookups on encrypted values (e.g. matching an inbound WhatsApp number). */
export function blindIndex(value: string): string {
  return createHmac("sha256", subkey("index")).update(value).digest("hex");
}
