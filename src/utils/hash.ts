import crypto from 'node:crypto';

export function createSha1Hash(content: string = '') {
  return crypto.createHash('sha1').update(content).digest('hex');
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
 *
 * FNV-1a 的核心公式是：h = (h + byte) x FNV_prime
 *
 * ```
 * h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
 * ```
 *
 * 这实际上是在用位移和加法模拟乘以 FNV 32位质数 16777619：
 * * 16777619 = 2^24 + 2^8 + 2^7 + 2^4 + 2^1 + 1
 * * 在 JavaScript 中，直接进行大整数乘法可能会触发浮点数逻辑（JS 数字是 64 位浮点数），而通过位移操作可以确保在 32 位整数范围内进行运算，且性能通常更快。
 */
export function createFnv1aHash(name: string, hash = HASH_BASE): number {
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return hash >>> 0;
}
