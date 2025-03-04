import Labels from '.';

const tests = [
  {
    args: 'ubuntu=docker://node:18',
    want: {
      label: 'ubuntu',
      image: 'docker://node:18',
    },
  },
  {
    args: 'ubuntu=host',
    want: {
      label: 'ubuntu',
      image: 'host',
    },
  },
  {
    args: 'ubuntu=vm:ubuntu-18.04',
    want: false,
  },
  {
    args: 'ubuntu-latest=gitea/runner-images:ubuntu-latest',
    want: {},
  },
];

// todo
describe.skip('labels test', () => {
  //
  tests.forEach((item) => {
    it(item.args, () => {
      const result = Labels.Parse(item.args);

      expect(result).toEqual(item.want);
    });
  });
});
