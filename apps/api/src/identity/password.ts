import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, value) => {
      if (error) reject(error);
      else resolve(value as Buffer);
    });
  });
}
export const K5_PASSWORD_ALGORITHM = "scrypt-v1";
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== "string" ||
      password.length < 12 ||
      password.length > 256 ||
      Buffer.byteLength(password, "utf8") > 1024) {
    throw new Error("Password does not meet the minimum security requirements");
  }
}

export async function hashNewPassword(password: string):
  Promise<{ salt: Buffer; passwordHash: Buffer; algorithm: typeof K5_PASSWORD_ALGORITHM }> {
  validatePassword(password);
  const salt = randomBytes(32);
  const passwordHash = await derive(password, salt);
  return { salt, passwordHash, algorithm: K5_PASSWORD_ALGORITHM };
}

export async function verifyPassword(
  password: unknown, salt: Buffer, expectedHash: Buffer, algorithm: string,
): Promise<boolean> {
  if (algorithm !== K5_PASSWORD_ALGORITHM ||
      !Buffer.isBuffer(salt) || salt.length !== 32 ||
      !Buffer.isBuffer(expectedHash) || expectedHash.length !== 64 ||
      typeof password !== "string" || password.length > 256) return false;
  const computed = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS) as Buffer;
  return timingSafeEqual(computed, expectedHash);
}

// Do equivalent expensive work for unknown usernames to reduce enumeration signal.
const DUMMY_SALT = Buffer.from("70f3dd10e71f485b6c098d5c041e8c6b3ee52cc4bedc2da15a816bb2d27ef2d1", "hex");
const DUMMY_HASH = Buffer.alloc(64);
export async function dummyPasswordCheck(password: unknown): Promise<void> {
  await verifyPassword(typeof password === "string" ? password : "",
    DUMMY_SALT, DUMMY_HASH, K5_PASSWORD_ALGORITHM);
}
