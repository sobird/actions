import { isMatchBy } from './isMatchBy';

it('isMatchBy', () => {
  const object = { fruit: 'apple', animal: 'cat' };
  const source = { fruit: 'apple', animal: 'cat' };
  const target = { fruit: ['apple', 'pear'], animal: ['cat', 'dog'] };

  const result = isMatchBy(object, source, target);
  console.log('result', result);
});
