// import Defaults from '@/pkg/workflow/job/defaults';

import { isEmptyDeep } from './isEmptyObject';

describe('Test isEmptyDeep Util', () => {
  it('{} is empty', () => {
    expect(isEmptyDeep({})).toBeTruthy();
  });

  it('[] is empty', () => {
    expect(isEmptyDeep([])).toBeTruthy();
  });

  // it('"" is empty', () => {
  //   console.log('isEmptyDeep', isEmptyDeep(''));
  //   expect(isEmptyDeep('')).toBeTruthy();
  // });

  // it('class is empty', () => {
  //   const defaults = new Defaults();
  //   console.log('defaults', isEmptyDeep(defaults));
  //   expect(isEmptyDeep('')).toBeTruthy();
  // });
});
