import { Index } from './index';

test('getName returns the default name', () => {
  expect(new Index().getName()).toBe('foo');
});

test('getName returns the current name', () => {
  const index = new Index();
  index.name = 'bar';

  expect(index.getName()).toBe('bar');
});
