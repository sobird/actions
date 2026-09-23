import { Op } from 'sequelize';
import { parse, stringify } from 'yaml';

import { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';

import { buildJobPayload, prepareRunAndInsert, type RunSeed } from './run';

const workflow = {
  name: 'CI',
  on: 'workflow_dispatch',
  env: { GLOBAL: '1' },
  defaults: { run: { shell: 'bash' } },
  permissions: { contents: 'read' },
  'run-name': 'CI for ${{ github.ref }}',
  concurrency: { group: 'ci' },
  jobs: {
    build: {
      name: 'build',
      'runs-on': 'ubuntu-latest',
      needs: ['setup'],
      strategy: { 'fail-fast': false, matrix: { os: ['ubuntu-latest', 'windows-latest'], node: [18, 20] } },
      steps: [{ run: 'echo build' }],
    },
    test: {
      'runs-on': 'ubuntu-latest',
      needs: ['build'],
      steps: [{ run: 'echo test' }],
    },
    named: {
      name: 'named ${{ matrix.os }}',
      'runs-on': 'ubuntu-latest',
      steps: [{ run: 'echo named' }],
    },
  },
};

/** Build one cell and read its payload back the way a runner would. */
function build(jobId: string, matrix: Record<string, unknown> = {}) {
  const { payload, name } = buildJobPayload(workflow, jobId, matrix);
  return { single: parse(payload.toString()) as Record<string, any>, name };
}

describe('buildJobPayload', () => {
  it('keeps the workflow-level keys and the one job', () => {
    const { single } = build('test');

    expect(Object.keys(single.jobs)).toEqual(['test']);
    expect(single).toMatchObject({
      name: 'CI',
      on: 'workflow_dispatch',
      env: { GLOBAL: '1' },
      defaults: { run: { shell: 'bash' } },
      permissions: { contents: 'read' },
      'run-name': 'CI for ${{ github.ref }}',
    });
  });

  it('drops the keys a single job does not carry', () => {
    const { single } = build('test');

    // concurrency is resolved into database columns, never handed to the runner
    expect(single.concurrency).toBeUndefined();
  });

  it('keeps the job itself and erases its needs', () => {
    const { single } = build('test');

    expect(single.jobs.test.steps).toEqual([{ run: 'echo test' }]);
    expect(single.jobs.test['runs-on']).toBe('ubuntu-latest');
    expect(single.jobs.test.needs).toBeUndefined();
  });

  it('does not mutate the workflow it was given', () => {
    build('build', { os: 'ubuntu-latest', node: 18 });

    expect(workflow.jobs.build.needs).toEqual(['setup']);
    expect(workflow.jobs.build.name).toBe('build');
    expect(workflow.jobs.build.strategy.matrix.os).toEqual(['ubuntu-latest', 'windows-latest']);
  });

  it('names a job without a name after its id', () => {
    const { single, name } = build('test');

    expect(name).toBe('test');
    expect(single.jobs.test.name).toBe('test');
  });

  it('writes no matrix for a job that has none', () => {
    const { single } = build('test');

    expect(single.jobs.test.strategy).toBeUndefined();
  });

  it('pins a multi-cell matrix down to the one cell', () => {
    const { single, name } = build('build', { os: 'ubuntu-latest', node: 18 });

    // values follow the key order, so node precedes os
    expect(name).toBe('build (18, ubuntu-latest)');
    expect(single.jobs.build.name).toBe('build (18, ubuntu-latest)');
    expect(single.jobs.build.strategy).toEqual({
      'fail-fast': false,
      matrix: { os: ['ubuntu-latest'], node: [18] },
    });
  });

  it('gives each cell of a matrix its own name and matrix', () => {
    const windows = build('build', { os: 'windows-latest', node: 20 });

    expect(windows.name).toBe('build (20, windows-latest)');
    expect(windows.single.jobs.build.strategy.matrix).toEqual({ os: ['windows-latest'], node: [20] });
  });

  it('drops the matrix when the cell is empty', () => {
    const { single } = build('build');

    // an empty cell is also what a fully excluded matrix resolves to
    expect(single.jobs.build.strategy).toEqual({ 'fail-fast': false });
    expect(single.jobs.build.strategy.matrix).toBeUndefined();
  });

  it('leaves a name holding an expression alone', () => {
    const { name } = build('named', { os: 'ubuntu-latest' });

    // the runner interpolates the name once it has the contexts
    expect(name).toBe('named ${{ matrix.os }}');
  });
});

/** 内核只认 content 与 seed，用一个不带 concurrency 的最小工作流试它自己那部分职责 */
const minimalWorkflow = stringify({
  name: 'CI',
  on: 'workflow_dispatch',
  jobs: {
    build: { 'runs-on': 'ubuntu-latest', steps: [{ run: 'echo build' }] },
  },
});

describe('prepareRunAndInsert', () => {
  // 同 dispatchWorkflow 那组：run 固定挂在仓库 1 下，按 run id 精确清理
  const createdRunIds: number[] = [];

  afterAll(async () => {
    if (createdRunIds.length === 0) {
      return;
    }
    const runIds = { [Op.in]: createdRunIds };
    await ActionRunJob.destroy({ where: { runId: runIds } });
    await ActionRunAttempt.destroy({ where: { runId: runIds } });
    await ActionRun.destroy({ where: { id: runIds } });
  });

  async function prepare(seed: Partial<RunSeed> = {}) {
    const created = await prepareRunAndInsert(minimalWorkflow, {
      ownerId: 1,
      repositoryId: 1,
      ref: 'refs/heads/master',
      commitSha: '',
      eventName: 'workflow_dispatch',
      ...seed,
    });
    createdRunIds.push(created.run.id);

    return created;
  }

  it('names the run after the workflow when the seed says nothing', async () => {
    const { run } = await prepare();

    expect(run.workflowId).toBe('CI');
    expect(run.title).toBe('CI');
  });

  it('reserves the columns the content decides for itself', async () => {
    const { run } = await prepare();

    // index 由内核从计数表取，status 由内核置 Waiting
    expect(run.index).toBeGreaterThan(0);
    expect(run.status).toBe(Status.Waiting);
  });

  it('lets the seed state the workflow id and title, the way a cron or webhook run would', async () => {
    const { run } = await prepare({ workflowId: 'ci.yml', title: 'nightly' });

    expect(run.workflowId).toBe('ci.yml');
    expect(run.title).toBe('nightly');
  });
});
