/**
 * sleep
 *
 * @example
 * ```ts
 * // Node.js 版本
 * import { setTimeout } from 'node:timers/promises';
 *
 * export const sleep = setTimeout;
 * ```
 *
 * @example
 * ```ts
 * // Node.js 版本
 * import util from 'node:util';
 *
 * export const sleep = util.promisify(setTimeout);
 * ```
 *
 *
 * sobird<i@sobird.me> at 2026/04/26 20:23:23 created.
 */

export function sleep(ms?: number): Promise<string>;
export function sleep<T>(ms: number, result: T): Promise<T>;

export async function sleep(ms = 1000, result: unknown = ''): Promise<unknown> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(result);
    }, ms);
  });
}
