/* eslint-disable no-param-reassign */
import crypto from 'node:crypto';

export function createSha1Hash(content: string = '') {
  // 创建 SHA-1 哈希
  const hash = crypto.createHash('sha1');
  hash.update(content);

  return hash.digest('hex');
}

// https://github.com/schwarzkopfb/fnv1a/blob/master/index.ts
/**
 * FNV-1a hash generation init value.
 * It's exposed, because this allows user to override it.
 * More info: https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV_hash_parameters
 */
const HASH_BASE = 0x811c9dc5;

/**
 * Generates 32 bit FNV-1a hash from the given string.
 * As explained here: http://isthe.com/chongo/tech/comp/fnv/
 */
export function createFnv1aHash(s: string, h = HASH_BASE): number {
  const l = s.length;

  for (let i = 0; i < l; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }

  return h >>> 0;
}

export function createFnv1aHashV2(name: string) {
  const fnvOffset32 = 2166136261;
  const fnvPrime32 = 16777619;

  let hash = fnvOffset32;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash *= fnvPrime32;
  }
  return hash >>> 0;
}
