// import { bench, describe } from 'vitest';

test('should work as expected', () => {
  expect(Math.sqrt(4)).toBe(2);
}, 100);

test.skipIf(process.platform !== 'win32')('platform should win32', () => {
  expect(process.platform).toBe('win32');
});

test.skipIf(process.platform !== 'darwin')('platform should darwin', () => {
  expect(process.platform).toBe('darwin');
});

test.runIf(process.platform === 'win32')('platform should win32', () => {
  expect(process.platform).toBe('win32');
});

test.runIf(process.platform === 'darwin')('platform should darwin', () => {
  expect(process.platform).toBe('darwin');
});

// test.only('only test this', () => {
//   // Only this test (and others marked with only) are run
//   assert.equal(Math.sqrt(4), 2);
// });

// The two tests marked with concurrent will be run in parallel
describe('suite', () => {
  const foo = 'foo';
  test('serial test', async () => {
    /* ... */
  });
  test.concurrent('concurrent test 1', async ({ expect }) => {
    expect(foo).toMatchSnapshot();
  });
  test.concurrent('concurrent test 2', async () => {
    /* ... */
  });
});

// An entry will be shown in the report for this test
test.todo('unimplemented test');

/**
 * describe
 *
 * 当在文件的顶层使用 test 或 bench 时，它们会作为隐式套件的一部分被收集起来。
 * 使用 describe 可以在当前上下文中定义一个新的测试套件，作为一组相关测试或基准以及其他嵌套测试套件。
 * 测试套件可让组织测试和基准，使报告更加清晰。
 */

const person = {
  isActive: true,
  age: 32,
};

describe('person', () => {
  test('person is defined', () => {
    expect(person).toBeDefined();
  });

  test('is active', () => {
    expect(person.isActive).toBeTruthy();
  });

  test('age limit', () => {
    expect(person.age).toBeLessThanOrEqual(32);
  });
});

describe.each([
  { a: 1, b: 1, expected: 2 },
  { a: 1, b: 2, expected: 3 },
  { a: 2, b: 1, expected: 3 },
])('describe object add($a, $b)', ({ a, b, expected }) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });

  test(`returned value not be greater than ${expected}`, () => {
    expect(a + b).not.toBeGreaterThan(expected);
  });

  test(`returned value not be less than ${expected}`, () => {
    expect(a + b).not.toBeLessThan(expected);
  });
});
