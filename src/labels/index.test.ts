import Labels, { HOSTED } from '.';

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

describe('labels hosted', () => {
  it('needs no docker when every label runs on the host', () => {
    const labels = new Labels([`ubuntu-latest=${HOSTED}`]);

    expect(labels.requireDocker()).toBe(false);
  });

  it('needs docker when any label maps to an image', () => {
    const labels = new Labels([`ubuntu-latest=${HOSTED}`, 'ubuntu-24.04=gitea/runner-images:ubuntu-24.04']);

    expect(labels.requireDocker()).toBe(true);
  });

  it('matches the hosted sentinel case-insensitively', () => {
    const labels = new Labels(['ubuntu-latest=Hosted']);

    expect(labels.requireDocker()).toBe(false);
  });

  it('needs docker for a label without an image', () => {
    const labels = new Labels(['ubuntu-latest']);

    expect(labels.requireDocker()).toBe(true);
  });
});
