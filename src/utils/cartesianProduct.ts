/**
 * takes an object with arrays of values and returns an array of unique combinations
 *
 * @param mapOfLists
 * @returns
 */

/**
 * calculates the Cartesian product of N arrays
 * @param ...arrays
 * @returns
 */
export function cartN(...arrays: unknown[][]) {
  // 笛卡尔积长度
  const length = arrays.reduce((acc, val) => { return acc * val.length; }, 1);
  if (length === 0) return [];

  const result = new Array(length);
  const tmparr = new Array(length * arrays.length);

  // 初始化每个数组的索引
  const indices = arrays.map(() => { return 0; });

  for (let i = 0; i < length; i++) {
    const start = i * arrays.length;
    const end = start + arrays.length;
    const slice = tmparr.slice(start, end);
    result[i] = slice;

    for (let j = 0; j < arrays.length; j++) {
      slice[j] = arrays[j][indices[j]];
    }

    // 更新索引数组 indices，实现循环递增
    for (let j = arrays.length - 1; j >= 0; j--) {
      indices[j] += 1;
      if (indices[j] < arrays[j].length) {
        break;
      }
      indices[j] = 0;
    }
  }

  return result;
}

/**
 * takes map of lists and returns list of unique tuples
 *
 * @param mapOfLists
 * @returns
 */
export function cartesianProduct(mapOfLists: Record<string, unknown[]>) {
  const keys = Object.keys(mapOfLists);
  const lists = Object.values(mapOfLists);

  const listCart = cartN(...lists);

  const result = [];
  for (const list of listCart) {
    const vMap: Record<string, unknown> = {};
    for (let i = 0; i < list.length; i++) {
      vMap[keys[i]] = list[i];
    }
    result.push(vMap);
  }

  return result;
}
