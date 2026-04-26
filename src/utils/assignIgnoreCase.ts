export function assignIgnoreCase(target: Record<string, unknown>, ...sources: Record<string, unknown>[]) {
  const foldKeys = new Map<string, string>();

  const toKey = (key: string) => {
    const lowerKey = key.toLowerCase();
    const k = foldKeys.get(lowerKey);
    if (k) {
      return k;
    }
    foldKeys.set(lowerKey, key);
    return key;
  };

  // const target: Record<string, unknown> = {};
  sources.forEach((source) => {
    Object.keys(source).forEach((key) => {
      // eslint-disable-next-line no-param-reassign
      target[toKey(key)] = source[key];
    });
  });
  return target;
}
