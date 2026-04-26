/**
 * replacer.test.ts
 *
 * sobird<i@sobird.me> at 2024/04/26 17:42:15 created.
 */

import { Replacer } from './replacer';

const testOriginal = 'user password: 123456, TOKEN is token';

const replacer = new Replacer([['123456', '***']]);

describe('Replacer', () => {
  it('should constructor', () => {
    const result = replacer.replace(testOriginal);
    expect(result).toBe('user password: ***, TOKEN is token');
  });

  it('replacer.add and replacer.replace', () => {
    replacer.add('token', 'xyz1234');
    const result = replacer.replace(testOriginal);
    expect(result).toBe('user password: ***, TOKEN is xyz1234');
  });
});
