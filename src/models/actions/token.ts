/**
 * Token primitives shared by the credentials of runners and tasks
 *
 * A token is stored as a pbkdf2 hash over a per-row random salt, so reading the
 * row does not hand out the plain token. The salt is not secret: it only keeps
 * two rows that happen to hold the same token from sharing a hash.
 *
 * sobird<i@sobird.me> at 2026/09/20 created.
 */

import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';

const DIGEST = 'sha256';
const ITERATIONS = 10000;
const KEY_LENGTH = 50;

export function generateToken(size = 20) {
  return randomBytes(size).toString('hex');
}

/** generates a fresh salt for a token hash */
export function generateTokenSalt() {
  return randomBytes(6).toString('base64url');
}

/** derives the hex hash that is stored for a token */
export function hashToken(token: string, salt: string) {
  return pbkdf2Sync(Buffer.from(token), Buffer.from(salt), ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
}

/** checks a plain token against a stored salt and hash, without leaking where they differ */
export function verifyToken(token: string, salt: string, hash: string) {
  if (!token || !salt || !hash) {
    return false;
  }

  const actual = Buffer.from(hashToken(token, salt));
  const expected = Buffer.from(hash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
