/* eslint-disable no-template-curly-in-string */

import type Runner from '@/runner';

import Job, { JobProps } from '.';

const { usesExecutor } = vi.hoisted(() => {
  return { usesExecutor: vi.fn() };
});

// 复用工作流作业的执行链路在 uses/index.test.ts 里单独覆盖，这里只验证委托
vi.mock('./uses', () => {
  return {
    default: class Uses {
      executor = usesExecutor;
    },
  };
});

/** 补齐 JobProps 中必填、但与用例无关的字段 */
function buildJob(props: Partial<JobProps> = {}) {
  return new Job({ name: '', outputs: {}, 'runs-on': 'ubuntu-latest', ...props });
}

describe('job strategy', () => {
  it('expands the matrix in declaration order, last key varying fastest', () => {
    const job = buildJob({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      strategy: {
        matrix: {
          os: ['ubuntu-latest', 'macos-latest'],
          node: [18, 20],
        },
      },
    });

    expect(job.strategy.Matrices).toEqual([
      { os: 'ubuntu-latest', node: 18 },
      { os: 'ubuntu-latest', node: 20 },
      { os: 'macos-latest', node: 18 },
      { os: 'macos-latest', node: 20 },
    ]);
  });

  it('spreads one job per matrix cell', () => {
    const job = buildJob({
      id: 'build',
      name: 'build',
      'runs-on': '${{ matrix.os }}',
      strategy: { matrix: { os: ['ubuntu-latest', 'macos-latest'], node: [18, 20] } },
    });

    const jobs = job.spread();

    expect(jobs).toHaveLength(4);
    expect(jobs.map((item) => item.id)).toEqual(['build', 'build', 'build', 'build']);
    expect(jobs.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(jobs.map((item) => item.total)).toEqual([4, 4, 4, 4]);
    expect(jobs.map((item) => item.name.source)).toEqual([
      'build (ubuntu-latest, 18)',
      'build (ubuntu-latest, 20)',
      'build (macos-latest, 18)',
      'build (macos-latest, 20)',
    ]);
    // 每个展开后的作业只保留自己那一格的 matrix，供 ${{ matrix.os }} 求值
    expect(jobs.map((item) => item.strategy.matrix)).toEqual([
      { os: ['ubuntu-latest'], node: [18] },
      { os: ['ubuntu-latest'], node: [20] },
      { os: ['macos-latest'], node: [18] },
      { os: ['macos-latest'], node: [20] },
    ]);
    expect(job.name.source).toBe('build');
  });

  it('keeps a name that is already an expression', () => {
    const job = buildJob({
      id: 'build',
      name: '${{ matrix.os }} build',
      strategy: { matrix: { os: ['ubuntu-latest'] } },
    });

    expect(job.spread()[0].name.source).toBe('${{ matrix.os }} build');
  });

  it('spreads to nothing without a strategy, so the planner runs the job once', () => {
    expect(buildJob({ id: 'build' }).spread()).toEqual([]);
  });
});

describe('job runsOn', () => {
  const runner = { context: { matrix: { platform: 'ubuntu-latest' } } } as unknown as Runner;

  it('wraps a single label in an array', () => {
    expect(buildJob({ 'runs-on': 'ubuntu-latest' }).runsOn(runner)).toEqual(['ubuntu-latest']);
  });

  it('keeps every label of an array', () => {
    expect(buildJob({ 'runs-on': ['self-hosted', 'linux', 'x64'] }).runsOn(runner)).toEqual([
      'self-hosted',
      'linux',
      'x64',
    ]);
  });

  it('reads labels and group', () => {
    expect(buildJob({ 'runs-on': { group: 'gcp', labels: 'ubuntu-latest' } }).runsOn(runner)).toEqual([
      'ubuntu-latest',
      'gcp',
    ]);
  });

  it('resolves expressions against the matrix context', () => {
    expect(buildJob({ 'runs-on': '${{ matrix.platform }}' }).runsOn(runner)).toEqual(['ubuntu-latest']);
  });
});

describe('job needs', () => {
  it('is empty when the job has no needs', () => {
    expect(buildJob().Needs).toEqual([]);
  });

  it('accepts a list of job ids', () => {
    expect(buildJob({ needs: ['build', 'test'] }).Needs).toEqual(['build', 'test']);
  });

  it('accepts a single job id', () => {
    expect(buildJob({ needs: 'build' as unknown as string[] }).Needs).toEqual(['build']);
  });
});

describe('job clone', () => {
  it('copies the job without sharing its fields, keeping the id', () => {
    const job = buildJob({ id: 'build', name: 'build' });

    const cloned = job.clone();

    expect(cloned).toBeInstanceOf(Job);
    expect(cloned).not.toBe(job);
    expect(cloned.id).toBe('build');

    cloned.name.source = 'cloned';
    expect(job.name.source).toBe('build');
    expect(cloned.name).not.toBe(job.name);
  });

  it('starts as a standalone successful job', () => {
    const job = buildJob();

    expect(job.index).toBe(0);
    expect(job.total).toBe(1);
    expect(job.Result).toBe('success');
    expect(job.Outputs).toEqual({});
  });
});

describe('job executor', () => {
  it('hands a reusable workflow job to the uses executor', () => {
    const executor = { execute: vi.fn() };
    usesExecutor.mockReturnValue(executor);

    const job = buildJob({ uses: './.github/workflows/reusable.yml' });

    expect(job.executor({} as Runner)).toBe(executor);
  });
});
