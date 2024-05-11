/**
 * function.ts
 *
 * @see https://docs.github.com/zh/actions/learn-github-actions/expressions#functions
 *
 * sobird<i@sobird.me> at 2024/05/12 1:51:41 created.
 */

/**
 * Returns true if search contains item.
 *
 * If search is an array, this function returns true if the item is an element in the array.
 * If search is a string, this function returns true if the item is a substring of search.
 * This function is not case sensitive. Casts values to a string.
 *
 * @todo
 * 支持使用对象筛选器的示例
 *
 * @param search
 * @param item
 * @returns
 */
export function contains(search: string | string[], item: string) {
  if (Array.isArray(search)) {
    return search.some((arrayItem) => {
      return arrayItem === item;
    });
  }

  if (typeof search === 'string') {
    return search.toLowerCase().includes(item.toString().toLowerCase());
  }

  return false;
}

/**
 * Returns a JSON object or JSON data type for value.
 *
 * You can use this function to provide a JSON object as an evaluated expression or to convert any data type that can be represented in JSON or JavaScript,
 * such as strings, booleans, null values, arrays, and objects.
 * @param value
 * @returns
 */
export function fromJSON(value: string) {
  if (typeof value !== 'string') {
    throw new Error('Cannot parse non-string type as JSON');
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`Invalid JSON: ${(err as Error).message}`);
  }
}
