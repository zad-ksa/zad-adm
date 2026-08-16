import crypto from "crypto";

/**
 * Reversible AES-256-GCM encryption for secrets that must be decrypted back
 * to their original plaintext later (e.g. DonorAccount.password, which staff
 * view and copy to log into a donor's external portal — unlike an auth
 * password, it can never be one-way hashed).
 *
 * Encrypted values are tagged with an "enc:v1:" prefix. decryptSecret()
 * returns any untagged string unchanged, so rows written before this module
 * existed (plaintext) keep working without a data migration.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const key = process.env.DONOR_ACCOUNT_ENC_KEY;
  if (!key) {
    throw new Error("DONOR_ACCOUNT_ENC_KEY is not defined in environment variables");
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("DONOR_ACCOUNT_ENC_KEY must be a base64 string decoding to 32 bytes (256-bit)");
  }
  return buf;
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) {
    // Legacy plaintext row written before encryption was added, or empty value.
    return stored;
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
