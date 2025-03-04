import { createSafeName } from './createSafeName';

describe('Test Utils createSafeName', () => {
  const tests = [{
    parts: ['a--a', 'BB正', 'c-C'],
    want: 'a-a-BB-c-C',
  }, {
    parts: ['a-a', '', '-'],
    want: 'a-a',
  }];

  tests.forEach((item) => {
    it(item.parts.join(' '), () => {
      expect(createSafeName(...item.parts)).toBe(item.want);
    });
  });
});
