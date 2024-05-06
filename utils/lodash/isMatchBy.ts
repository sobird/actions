import lodash from 'lodash';

/** 检查两个映射 object 和 source 是否在 target 映射中指定的键上有相等的值 */
export function isMatchBy(object: Record<string, unknown>, source: Record<string, unknown>, target: Record<string, unknown[]>) {
  const objectEntries = Object.entries(object);
  for (const objectEntry of objectEntries) {
    const [objectKey, objectValue] = objectEntry;
    const targetValue = target[objectKey];
    const sourceValue = source[objectKey];

    if (sourceValue && targetValue && !lodash.isEqual(objectValue, sourceValue)) {
      return false;
    }
  }

  return true;
}
