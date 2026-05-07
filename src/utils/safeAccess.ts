/**
 * 现代原生写法：
 * ```ts
 * const value = user?.profile?.address?.city;
 * ```
 */
export function safeAccess(obj: any, ...keys: string[]) {
  let result = obj;
  for (const key of keys) {
    if (result === null || !Object.prototype.hasOwnProperty.call(result, key)) {
      return undefined;
    }
    result = result[key];
  }
  return result;
}
