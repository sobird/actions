/**
 * 对lodash进行扩展
 *
 * sobird<i@sobird.me> at 2024/03/27 11:20:42 created.
 */

import lodash from 'lodash';

import { isMatchBy } from './isMatchBy';

declare module 'lodash' {
  interface LoDashStatic {
    isMatchBy: typeof isMatchBy
  }
}

lodash.mixin({
  isMatchBy,
});

export default lodash;
