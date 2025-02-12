/* eslint-disable no-template-curly-in-string */
// todo 要同时测试 DockerContainer 和 HostedContainer
import Runner from '@/pkg/runner';

import Expression from '.';
import { type Job } from '../runner/context/job';

vi.mock('@/pkg/runner');

afterAll(async () => {});

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

const runner: Runner = new (Runner as any)();

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

describe('Condition Functions Test', () => {
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

  describe('always()', () => {
    const testCases = [
      { jobStatus: null, expected: true },
      { jobStatus: 'Cancelled', expected: true },
      { jobStatus: 'Failure', expected: true },
      { jobStatus: 'Success', expected: true },
    ];

    testCases.forEach(({ jobStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus}`, () => {
        const expression = new Expression('always()', [], [], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });

  describe('cancelled()', () => {
    const testCases = [
      { jobStatus: 'cancelled', expected: true },
      { jobStatus: null, expected: false },
      { jobStatus: 'failure', expected: false },
      { jobStatus: 'success', expected: false },
    ];

    testCases.forEach(({ jobStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus}`, () => {
        runner.context.job = {
          status: jobStatus,
        } as Job;

        const expression = new Expression('cancelled()', [], ['cancelled'], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });

  describe('failure()', () => {
    const testCases = [
      { jobStatus: 'failure', expected: true },
      { jobStatus: null, expected: false },
      { jobStatus: 'cancelled', expected: false },
      { jobStatus: 'success', expected: false },
    ];

    testCases.forEach(({ jobStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus}`, () => {
        runner.context.job = {
          status: jobStatus,
        } as Job;

        const expression = new Expression('failure()', [], ['failure'], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });

  describe('failure() with composite conditions', () => {
    const testCases = [
      { jobStatus: 'Failure', actionStatus: 'Failure', expected: true },
      { jobStatus: 'Failure', actionStatus: 'Success', expected: false },
      { jobStatus: 'Success', actionStatus: 'Failure', expected: true },
      { jobStatus: 'Success', actionStatus: 'Success', expected: false },
      { jobStatus: 'Success', actionStatus: null, expected: false },
    ];

    testCases.forEach(({ jobStatus, actionStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus} and actionStatus is ${actionStatus}`, () => {
        runner.context.job = {
          status: jobStatus,
        } as Job;
        runner.context.github.action_status = actionStatus;

        const expression = new Expression('failure()', [], ['failure'], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });

  describe('success()', () => {
    const testCases = [
      { jobStatus: null, expected: true },
      { jobStatus: 'success', expected: true },
      { jobStatus: 'cancelled', expected: false },
      { jobStatus: 'failure', expected: false },
    ];

    testCases.forEach(({ jobStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus}`, () => {
        runner.context.job = {
          status: jobStatus,
        } as Job;

        const expression = new Expression('success()', [], ['success'], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });

  describe('success() with composite conditions', () => {
    const testCases = [
      { jobStatus: 'Failure', actionStatus: 'Failure', expected: false },
      { jobStatus: 'Failure', actionStatus: 'Success', expected: true },
      { jobStatus: 'Success', actionStatus: 'Failure', expected: false },
      { jobStatus: 'Success', actionStatus: 'Success', expected: true },
      { jobStatus: 'Success', actionStatus: null, expected: true },
    ];

    testCases.forEach(({ jobStatus, actionStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus} and actionStatus is ${actionStatus}`, () => {
        runner.context.job = {
          status: jobStatus,
        } as Job;
        runner.context.github.action_status = actionStatus;

        const expression = new Expression('success()', [], ['success'], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });
});
