/* eslint-disable no-template-curly-in-string */

import { ContainerCreateOptions } from 'dockerode';

import Runner from '@/pkg/runner';
import Docker from '@/pkg/runner/container/docker';

import Expression from '.';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/home/runner',
  Image: 'node:lts-slim',
  name: 'node-lts-slim',
  Env,
  HostConfig: {
    AutoRemove: true,
    Privileged: true,
    UsernsMode: '',
  },
  platform: '',

  // StopTimeout: 30,
};

const docker = new (Docker as any)(containerCreateOptions);

const startExecutor = docker.start();
await startExecutor.execute();

const context = {
  github: {
    actor: 'sobird',
    event_name: 'push',
    event: {
      issue: {
        labels: [
          {
            name: 'bug',
          },
          {
            name: 'error',
          },
        ],
      },
    },
  },
};

const runner: Runner = {
  context,
  container: docker,
} as unknown as Runner;

const literals = [{
  source: '${{ false }}',
  expected: false,
},
{
  source: '${{ null }}',
  expected: '',
},
{
  source: '${{ 711 }}',
  expected: '711',
}, {
  source: '${{ -9.2 }}',
  expected: '-9.2',
}, {
  source: '${{ 0xff }}',
  expected: '255',
}, {
  source: '${{ github.event }}',
  expected: '[object Object]',
}];

const operators = [
  {
    source: '${{ (2 + 2) * 3 }}',
    expected: '12',
  },
  {
    source: "${{ github['actor'] }}",
    expected: 'sobird',
  },
  {
    source: '${{ github.actor }}',
    expected: 'sobird',
  },
  {
    source: '${{ !true }}',
    expected: false,
  },
  {
    source: '${{ 123 < 456 && 123 <= 456 && 123 <=123 }}',
    expected: true,
  },
  {
    source: '${{ 456 > 123 && 456 >= 123 && 456 >= 456 }}',
    expected: true,
  },
  {
    source: '${{ 123 == 123 }}',
    expected: true,
  },
  {
    source: '${{ 123 != 456 }}',
    expected: true,
  },
  {
    source: '${{ 0 || 456 }}',
    expected: '456',
  },
];

const functions = [{
  source: "${{ contains('Hello world', 'llo') }}",
  expected: true,
}, {
  source: "${{ contains(github.event.issue.labels.*.name, 'bug') }}",
  expected: true,
}, {
  source: "${{ fromJSON('[\"push\", \"pull_request\"]') }}",
  expected: 'push,pull_request',
}, {
  source: "${{ contains(fromJSON('[\"push\", \"pull_request\"]'), github.event_name) }}",
  expected: true,
}, {
  source: "${{startsWith('Hello world', 'He')}}",
  expected: true,
}, {
  source: "${{endsWith('Hello world', 'ld')}}",
  expected: true,
}, {
  source: "${{ format('Hello {0} {1} {2}', 'Mona', 'the', 'Octocat') }}",
  expected: 'Hello Mona the Octocat',
},
// {
//   source: "${{ format('{{Hello {0} {1} {2}}}', 'Mona', 'the', 'Octocat') }}",
//   expected: '{Hello Mona the Octocat!}',
// },
{
  source: "${{ join(github.event.issue.labels.*.name, ', ') }}",
  expected: 'bug, error',
}, {
  source: '${{ toJSON(github) }}',
  expected: JSON.stringify(context.github),
},
];

describe('test Expression Literals', () => {
  literals.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(runner);
      expect(result).toBe(item.expected);
    });
  });
});

describe('test Expression Operators', () => {
  operators.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(runner);
      expect(result).toBe(item.expected);
    });
  });
});

describe('test Expression Functions', () => {
  functions.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(runner as unknown as Runner);
      expect(result).toBe(item.expected);
    });
  });

  it('${{ hashFiles("**/package.json") }} - test case', () => {
    const expression = new Expression('${{ hashFiles("bin/hashFiles/index.cjs") }}', ['github'], ['hashFiles']);
    const hash = expression.evaluate(runner);
    expect(hash.length).toBe(64);
  });
});

afterAll(async () => {
  const removeExecutor = docker.remove();
  await removeExecutor.execute();
});
