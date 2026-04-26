export function safeAccess(obj: object, ...keys: string[]) {
  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined || !result.hasOwnProperty(key)) {
      return undefined;
    }
    result = result[key];
  }
  return result;
}
