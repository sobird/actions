import { isMatchBy } from './isMatchBy';

/**
 * `isMatchBy` 是 matrix include 能否合并的判据：一个 include 只有不覆盖矩阵已经产出的值时才能加到某个
 * 组合上。第三个参数是原始矩阵的定义，它的值本身不参与比较，只用来标记「这个键由矩阵决定」。
 * 见 src/workflow/job/strategy.ts:226。
 */
describe('isMatchBy', () => {
  const matrix = { fruit: ['apple', 'pear'], animal: ['cat', 'dog'] };

  it('accepts an include whose values agree with the combination', () => {
    // include 只写了 fruit，组合里的 animal 没被提到就不参与比较
    expect(isMatchBy({ fruit: 'apple', animal: 'cat' }, { fruit: 'apple' }, matrix)).toBe(true);
  });

  it('rejects an include that overwrites a value the matrix produced', () => {
    // fruit 由矩阵决定且对不上，别的键一致也不能合并
    expect(isMatchBy({ fruit: 'apple', animal: 'cat' }, { fruit: 'pear', animal: 'cat' }, matrix)).toBe(false);
  });

  it('ignores keys the matrix does not define', () => {
    // color 不在矩阵里，include 想怎么给都行
    expect(isMatchBy({ fruit: 'apple', animal: 'cat' }, { color: 'green' }, matrix)).toBe(true);
  });

  it('lets an include fill in a key the combination does not have', () => {
    // 组合里没有 animal，include 可以补上，这也是 include 唯一能扩出新组合的途径
    expect(isMatchBy({ fruit: 'apple' }, { animal: 'dog' }, matrix)).toBe(true);
  });

  it('compares nothing when the matrix defines no keys', () => {
    expect(isMatchBy({ fruit: 'apple' }, { fruit: 'pear' }, {})).toBe(true);
  });

  it('treats a falsy include value as no constraint at all', () => {
    // 注意：上游的规则是「include 的值只要和矩阵产出的不同就不能合并」，空串同样是一个值，
    // 这里因为用真值判断而把 `fruit: ''` 当成了没写。要跟上游对齐的话，这个断言要跟着改。
    expect(isMatchBy({ fruit: 'apple' }, { fruit: '' }, matrix)).toBe(true);
  });
});
