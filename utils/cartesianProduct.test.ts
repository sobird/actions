import { cartN, cartesianProduct } from './cartesianProduct';

const mapOfLists = {
  a: ['a1', 'a2'],
  b: [1, 2],
  c: ['c1', 'c2'],
};

describe('cartesian product', () => {
  it('cartN test case', () => {
    const arrays = Object.values(mapOfLists);
    const result = cartN(...arrays);
    expect(result).toEqual([
      ['a1', 1, 'c1'],
      ['a1', 1, 'c2'],
      ['a1', 2, 'c1'],
      ['a1', 2, 'c2'],
      ['a2', 1, 'c1'],
      ['a2', 1, 'c2'],
      ['a2', 2, 'c1'],
      ['a2', 2, 'c2'],
    ]);
  });

  it('cartesianProduct test case', () => {
    const result = cartesianProduct(mapOfLists);
    expect(result).toEqual(
      [
        { a: 'a1', b: 1, c: 'c1' },
        { a: 'a1', b: 1, c: 'c2' },
        { a: 'a1', b: 2, c: 'c1' },
        { a: 'a1', b: 2, c: 'c2' },
        { a: 'a2', b: 1, c: 'c1' },
        { a: 'a2', b: 1, c: 'c2' },
        { a: 'a2', b: 2, c: 'c1' },
        { a: 'a2', b: 2, c: 'c2' },
      ],
    );
  });
});
