/* eslint-disable no-await-in-loop */
/**
 * function.ts
 *
 * @see https://docs.github.com/zh/actions/learn-github-actions/expressions#functions
 *
 * sobird<i@sobird.me> at 2024/05/12 1:51:41 created.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';

import glob from '@actions/glob';
import _ from 'lodash';

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
function contains(search: string | string[], item: string) {
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
 * Returns true when searchString starts with searchValue.
 * This function is not case sensitive. Casts values to a string.
 *
 * @param searchString
 * @param searchValue
 * @returns
 */
function startsWith(searchString: string, searchValue: string) {
  return searchString.toLowerCase().startsWith(searchValue.toLowerCase());
}

/**
 * Returns true if searchString ends with searchValue.
 * This function is not case sensitive. Casts values to a string.
 *
 * @param searchString
 * @param searchValue
 */
function endsWith(searchString: string, searchValue: string) {
  return searchString.toLowerCase().endsWith(searchValue.toLowerCase());
}

/**
 * Replaces values in the string, with the variable replaceValueN.
 * Variables in the string are specified using the {N} syntax, where N is an integer.
 * You must specify at least one replaceValue and string.
 * There is no maximum for the number of variables (replaceValueN) you can use.
 * Escape curly braces using double braces.
 */
function format(string: string, ...replaceValues: string[]) {
  let result = string;
  replaceValues.forEach((value) => {
    result = result.replace(/{\{(\d+)\}\}/g, () => { return value; });
  });
  result = result.replace(/{(\d+)}/g, (match, index) => {
    return replaceValues[index] === undefined ? match : replaceValues[index];
  });
  return result;
}

/**
 * The value for array can be an array or a string.
 * All values in array are concatenated into a string.
 * If you provide optionalSeparator, it is inserted between the concatenated values.
 * Otherwise, the default separator , is used. Casts values to a string.
 *
 * @todo
 *
 * @param array
 * @param optionalSeparator
 */
function join(array: string | string[], optionalSeparator: string = ',') {
  if (Array.isArray(array)) {
    return array.join(optionalSeparator);
  }
  if (typeof array === 'string') {
    return array.split('').join(optionalSeparator);
  }
  // todo
}

/**
 * Returns a pretty-print JSON representation of value.
 * You can use this function to debug the information provided in contexts.
 */
function toJSON(value: JSON) {
  return JSON.stringify(value);
}

/**
 * Returns a JSON object or JSON data type for value.
 *
 * You can use this function to provide a JSON object as an evaluated expression or to convert any data type that can be represented in JSON or JavaScript,
 * such as strings, booleans, null values, arrays, and objects.
 * @param value
 * @returns
 */
function fromJSON(value: string) {
  if (typeof value !== 'string') {
    throw new Error('Cannot parse non-string type as JSON');
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`Invalid JSON: ${(err as Error).message}`);
  }
}

/**
 * Returns a single hash for the set of files that matches the path pattern.
 *
 * You can provide a single path pattern or multiple path patterns separated by commas.
 * The path is relative to the GITHUB_WORKSPACE directory and can only include files inside of the GITHUB_WORKSPACE.
 * This function calculates an individual SHA-256 hash for each matched file, and then uses those hashes to calculate a final SHA-256 hash for the set of files.
 * If the path pattern does not match any files, this returns an empty string.
 * For more information about SHA-256, see "SHA-2." You can use pattern matching characters to match file names.
 * Pattern matching for hashFiles follows glob pattern matching and is case-insensitive on Windows.
 * For more information about supported pattern matching characters, see the Patterns section in the @actions/glob documentation.
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/glob/src/internal-hash-files.ts
 */
export async function hashFiles(...patterns: string[]) {
  const hashes = [];

  for (const pattern of patterns) {
    const globber = await glob.create(pattern, {
      followSymbolicLinks: false,
      matchDirectories: false,
      omitBrokenSymbolicLinks: true,
    });

    const filepaths = await globber.glob();

    if (filepaths.length === 0) {
      return '';
    }

    for (const filepath of filepaths) {
      const content = fs.readFileSync(filepath);
      const hash = createHash('sha256').update(content).digest('hex');
      hashes.push(hash);
    }
  }

  const combinedHashes = hashes.join();
  const finalHash = createHash('sha256').update(combinedHashes).digest('hex');

  return finalHash;
}

/**
 * Returns true when all previous steps have succeeded.
 */
export function success() {
  // todo
}

export function always() {
  return true;
}

/**
 * Returns true if the workflow was canceled.
 */
export function cancelled() {

}

/**
 * Returns true when any previous step of a job fails.
 * If you have a chain of dependent jobs, failure() returns true if any ancestor job fails.
 */
export function failure() {

}

// const reg = /^(\w+\.)+\*\.(\w+)$/;
function objectFilter(array: object, name: string) {
  // const parts = path.split('.*.');
  // const [prefix, suffix] = parts;
  // const result = _.result({}, prefix);

  if (_.isArray(array)) {
    const res = array.map((item: any) => { return item[name]; });
    return res;
  }
}

export default {
  contains,
  startsWith,
  endsWith,
  format,
  join,
  toJSON,
  fromJSON,
  // hashFiles,
  // success,
  always,
  // cancelled,
  // failure,
  objectFilter,
};
