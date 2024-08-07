import Labels from '.';

const tests = [
  {
    args: 'ubuntu:docker://node:18',
    want: {
      name: 'ubuntu',
      schema: 'docker',
      rest: '//node:18',
    },
  },
  {
    args: 'ubuntu:host',
    want: {
      name: 'ubuntu',
      schema: 'host',
      rest: '',
    },
  },
  {
    args: 'ubuntu:vm:ubuntu-18.04',
    want: false,
  },
  {
    args: 'ubuntu-latest:gitea/runner-images:ubuntu-latest',
    want: {},
  },
];

describe('labels test', () => {
  //
  tests.forEach((item) => {
    it(item.args, () => {
      const result = Labels.Parse(item.args);

      expect(result).toEqual(item.want);
    });
  });
});
