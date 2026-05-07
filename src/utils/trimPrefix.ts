export function trimPrefix(str: string, prefix: string) {
  return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}
