import { assignIgnoreCase } from './assignIgnoreCase';

it('utils assignIgnoreCase test', () => {
  const sources = [
    { Name: 'sobrd', age: '18' },
    { name: 'test', Age: '22' },
    { Name: 'last', gender: 1 },
  ];
  const target = assignIgnoreCase({}, ...sources);

  expect(target).toEqual({
    Name: 'last',
    age: '22',
    gender: 1,
  });
});
