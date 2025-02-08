/* eslint-disable no-template-curly-in-string */
// todo 要同时测试 DockerContainer 和 HostedContainer
import Runner from '@/pkg/runner';
import DockerContainer from '@/pkg/runner/container/docker';
import HostedContainer from '@/pkg/runner/container/hosted';

import Expression from '.';

vi.mock('@/pkg/runner/container/docker');
vi.mock('@/pkg/runner/container/hosted');

const dockerContainer: DockerContainer = new (HostedContainer as any)();

const startExecutor = dockerContainer.start();
await startExecutor.execute();

afterAll(async () => {
  const removeExecutor = dockerContainer.remove();
  await removeExecutor.execute();
});

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
    'who-to-greet': 'hello',
    server_url: 'https://github.com',
    token: 'token',
  },
  steps: {
    'actions-setup-node-v4': {
      outputs: { 'node-version': 'v20.18.2' },
      outcome: 'success',
      conclusion: 'success',
    },
    'yarn-cache': {
      outputs: { 'cache-hit': 'false' },
      outcome: 'success',
      conclusion: 'success',
    },
    'actions-checkout-v4': { outputs: {}, outcome: 'success', conclusion: 'success' },
  },
  runner: {
    os: 'Linux',
  },
};

const runner: Runner = {
  context,
  container: dockerContainer,
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
}, {
  source: "${{ github.server_url == 'https://github.com' && github.token || '' }}",
  expected: 'token',
}, {
  source: '${{ github.who-to-greet }}',
  expected: 'hello',
}, {
  source: "${{ steps.yarn-cache.outputs.cache-hit != 'true' }}",
  expected: true,
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
{
  source: "${{ runner.os }}-dependencies-${{ hashFiles('pnpm-lock.yaml') }}",
  expected: 'Linux-dependencies-',
},
];

describe('test Expression Literals', () => {
  literals.forEach((item) => {
    it(`${item.source} - test case`, () => {
      const expression = new Expression(item.source, ['github', 'steps']);
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
      const expression = new Expression(item.source, ['github', 'runner'], ['hashFiles']);
      const result = expression.evaluate(runner as unknown as Runner);
      expect(result).toBe(item.expected);
    });
  });

  it('${{ hashFiles("**/package.json") }} - test case', () => {
    const expression = new Expression('${{ hashFiles("bin/hashFiles/index.js") }}', ['github'], ['hashFiles']);
    const hash = expression.evaluate(runner);
    expect(hash.length).toBe(64);
  });
});
