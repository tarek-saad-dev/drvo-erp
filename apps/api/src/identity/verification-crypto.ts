import {
  createHmac, randomBytes, timingSafeEqual,
} from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_TEXT = /^[A-Za-z0-9_-]{43}$/;
// Deliberately narrow initial v1 email policy: ASCII local/domain. Future
// internationalized email addresses require a reviewed, backwards-compatible
// canonicalization migration to avoid duplicate-identity ambiguity.
const LOCAL = /^[a-z0-9!#$%&'*+/=?^`{|}~._-]+$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HEX_64 = /^[0-9a-f]{64}$/;
export type ChallengePurpose = "OWNER_BOOTSTRAP" | "ACCOUNT_INVITE" | "ACCOUNT_RECOVERY";

export function normalizeVerificationEmail(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 254) {
    throw new Error("Invalid email address");
  }
  const value = raw.trim().toLowerCase();
  const at = value.indexOf("@");
  if (at <= 0 || at === value.length - 1 || at !== value.lastIndexOf("@")) {
    throw new Error("Invalid email address");
  }
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > 64 || !LOCAL.test(local) || local.startsWith(".") ||
      local.endsWith(".") || local.includes("..")) {
    throw new Error("Invalid email address");
  }
  const labels = domain.split(".");
  if (labels.length < 2 || domain.length > 253 ||
      labels.some(label => !DOMAIN_LABEL.test(label)) ||
      labels.at(-1)!.length < 2) {
    throw new Error("Invalid email address");
  }
  return value;
}

export function loadVerificationSecret(source: string | undefined): Buffer {
  // 256-bit key, supplied ONLY from secret management on the API host.
  // Never use a demo/default key. Do NOT put it into the client or GitHub code.
  if (!source || !/^[0-9a-f]{64}$/i.test(source)) {
    throw new Error("DRVO verification HMAC secret missing or invalid");
  }
  const key = Buffer.from(source, "hex");
  if (key.length !== 32 || key.every(byte => byte === 0)) {
    throw new Error("Invalid verification HMAC secret");
  }
  return key;
}

function mac(secret: Buffer, domain: string, value: string): string {
  if (!Buffer.isBuffer(secret) || secret.length !== 32) {
    throw new Error("Invalid verification key");
  }
  return createHmac("sha256", secret)
    .update("drvo-erp:k5d:v1:" + domain + "\0" + value, "utf8")
    .digest("hex");
}

export function verificationEmailDigest(email: unknown, secret: Buffer): string {
  return mac(secret, "email", normalizeVerificationEmail(email));
}

export function generateOpaqueVerificationToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function verificationTokenDigest(
  token: unknown, purpose: ChallengePurpose, secret: Buffer,
): string {
  if (purpose !== "OWNER_BOOTSTRAP" && purpose !== "ACCOUNT_INVITE" &&
      purpose !== "ACCOUNT_RECOVERY") {
    throw new Error("Invalid token purpose");
  }
  if (typeof token !== "string" || !TOKEN_TEXT.test(token)) {
    throw new Error("Invalid verification token");
  }
  return mac(secret, "token:" + purpose, token);
}

export function matchesVerificationDigest(expected: unknown, actual: unknown): boolean {
  // Constant-time comparison for hashes from the database. Expiry, attempts,
  // one-time use, approval matching and rate limits belong in SQL transactions
  // that are deliberately not activated in this crypto-only foundation.
  if (typeof expected !== "string" || typeof actual !== "string" ||
      !HEX_64.test(expected) || !HEX_64.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}
