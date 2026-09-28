// todo 要同时测试 DockerContainer 和 HostedContainer
import Runner from '@/runner';

import Expression from '.';
import { type Job } from '../runner/context/job';

vi.mock('@/runner');

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

const runner: Runner = new (Runner as any)(undefined, {
  context,
});

const literals = [
  {
    source: '${{ false }}',
    expected: false,
  },
  {
    source: '${{ true }}',
    expected: true,
  },
  {
    source: false,
    expected: false,
  },
  {
    source: true,
    expected: true,
  },
  {
    source: '${{ null }}',
    // @todo should equal null
    expected: '',
  },
  {
    source: null,
    expected: '',
  },
  {
    source: '${{ 711 }}',
    expected: '711',
  },
  {
    source: '${{ -9.2 }}',
    expected: '-9.2',
  },
  {
    source: '${{ 0xff }}',
    expected: '255',
  },
  {
    source: '${{ github.event }}',
    expected: '[object Object]',
  },
  {
    source: "${{ github.server_url == 'https://github.com' && github.token || '' }}",
    expected: 'token',
  },
  {
    source: '${{ github.who-to-greet }}',
    expected: 'hello',
  },
  {
    source: "${{ steps.yarn-cache.outputs.cache-hit != 'true' }}",
    expected: true,
  },
];

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

const functions = [
  {
    source: "${{ contains('Hello world', 'llo') }}",
    expected: true,
  },
  {
    source: "${{ contains(github.event.issue.labels.*.name, 'bug') }}",
    expected: true,
  },
  {
    source: '${{ fromJSON(\'["push", "pull_request"]\') }}',
    expected: 'push,pull_request',
  },
  {
    source: '${{ contains(fromJSON(\'["push", "pull_request"]\'), github.event_name) }}',
    expected: true,
  },
  {
    source: "${{ startsWith('Hello world', 'He') }}",
    expected: true,
  },
  {
    source: "${{ endsWith('Hello world', 'ld') }}",
    expected: true,
  },
  {
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
  },
  {
    source: '${{ toJSON(github) }}',
    expected: JSON.stringify(runner.context.github),
  },
  {
    source: "${{ runner.os }}-dependencies-${{ hashFiles('pnpm-lock.yaml') }}",
    expected: 'Linux-dependencies-',
  },
];

describe('Expression Literals', () => {
  literals.forEach((item) => {
    it(`${item.source}`, () => {
      const expression = new Expression(item.source, ['github', 'steps']);
      const result = expression.evaluate(runner);
      expect(result).toBe(item.expected);
    });
  });
});

describe('Expression Operators', () => {
  operators.forEach((item) => {
    it(`${item.source}`, () => {
      const expression = new Expression(item.source, ['github']);
      const result = expression.evaluate(runner);
      expect(result).toBe(item.expected);
    });
  });
});

describe('Expression Functions', () => {
  functions.forEach((item) => {
    it(`${item.source}`, () => {
      const expression = new Expression(item.source, ['github', 'runner'], ['hashFiles']);
      const result = expression.evaluate(runner as unknown as Runner);
      expect(result).toBe(item.expected);
    });
  });

  it('${{ hashFiles("**/package.json") }}', () => {
    const expression = new Expression('${{ hashFiles("bin/hashFiles/index.js") }}', ['github'], ['hashFiles']);
    const hash = expression.evaluate(runner);
    expect(hash.length).toBe(64);
  });

  describe('always()', () => {
    const testCases = [
      { jobStatus: null, expected: true },
      { jobStatus: 'cancelled', expected: true },
      { jobStatus: 'failure', expected: true },
      { jobStatus: 'success', expected: true },
    ];

    testCases.forEach(({ jobStatus, expected }) => {
      it(`should return ${expected} when jobStatus is ${jobStatus}`, () => {
        const expression = new Expression('always()', [], ['always'], true, true);
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

  /**
   * Point the shared runner at an embedded step of a composite's main run, and give it
   * the two statuses such a step chooses between.
   */
  function compositeMainStep(jobStatus: string, actionStatus: string) {
    runner.context.job = { status: jobStatus } as Job;
    runner.context.github.action_status = actionStatus;
    runner.parent = {} as Runner;
    runner.stage = 'Main';
  }

  describe('status functions in a composite main step', () => {
    // 复合动作的步骤读的是复合动作自己的结果，不是作业状态，两列因此刻意取不同的值
    const testCases = [
      { jobStatus: 'failure', actionStatus: 'failure', success: false, failure: true },
      { jobStatus: 'failure', actionStatus: 'success', success: true, failure: false },
      { jobStatus: 'success', actionStatus: 'failure', success: false, failure: true },
      { jobStatus: 'success', actionStatus: 'success', success: true, failure: false },
      // 复合动作还没有记录结果时按成功算
      { jobStatus: 'failure', actionStatus: '', success: true, failure: false },
    ];

    afterEach(() => {
      runner.parent = undefined;
      runner.context.github.action_status = '';
    });

    testCases.forEach(({ jobStatus, actionStatus, success, failure }) => {
      it(`should read the composite result ('${actionStatus}') rather than the ${jobStatus} job`, () => {
        compositeMainStep(jobStatus, actionStatus);

        expect(new Expression('success()', [], ['success'], true, true, 'step').evaluate(runner)).toBe(success);
        expect(new Expression('failure()', [], ['failure'], true, true, 'step').evaluate(runner)).toBe(failure);
      });
    });

    // 上游的 cancelled() 没有复合动作分支，读的一直是作业状态
    it('should keep cancelled() on the job status', () => {
      compositeMainStep('cancelled', 'success');

      expect(new Expression('cancelled()', [], ['cancelled'], true, true, 'step').evaluate(runner)).toBe(true);
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
        // runner.context.StepResult = {
        //   conclusion: actionStatus,
        // };

        const expression = new Expression('success()', [], ['success'], true, true);
        const result = expression.evaluate(runner);
        expect(result).toBe(expected);
      });
    });
  });

  describe('status functions outside a composite main step', () => {
    // 作业级步骤、以及复合动作步骤的 pre 阶段，读的都是作业状态
    const places = [
      { where: 'a job-level step', parent: undefined, stage: 'Main' as const },
      { where: "the pre stage of a composite's step", parent: {} as Runner, stage: 'Pre' as const },
    ];

    afterEach(() => {
      runner.parent = undefined;
      runner.stage = 'Main';
      runner.context.github.action_status = '';
    });

    places.forEach(({ where, parent, stage }) => {
      it(`should read the failed job from ${where}`, () => {
        runner.context.job = { status: 'failure' } as Job;
        runner.context.github.action_status = 'success';
        runner.parent = parent;
        runner.stage = stage;

        expect(new Expression('success()', [], ['success'], true, true, 'step').evaluate(runner)).toBe(false);
        expect(new Expression('failure()', [], ['failure'], true, true, 'step').evaluate(runner)).toBe(true);
      });
    });
  });

  describe('success() with needs', () => {
    const testCases = [
      { result: 'success', expected: true },
      { result: 'failure', expected: false },
      { result: 'skipped', expected: false },
    ];

    testCases.forEach(({ result, expected }) => {
      it(`should return ${expected} when a needed job is ${result}`, () => {
        runner.context.job = { status: null } as Job;
        (runner as unknown as { run: unknown }).run = {
          job: { Needs: ['setup'] },
          workflow: { jobs: { setup: { Needs: [], Result: result } } },
        };

        const expression = new Expression('success()', [], ['success'], true, true);
        expect(expression.evaluate(runner)).toBe(expected);
      });
    });
  });
});
