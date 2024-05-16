export function isEmptyDeep(obj: Record<string, any>) {
  if (obj === null) {
    return false;
  }
  if (typeof obj !== 'object') {
    return false;
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (!isEmptyDeep(obj[key])) {
        return false;
      }
    } else if (obj[key] !== undefined) {
      return false;
    }
  }

  return true;
}
