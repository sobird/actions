import { Op } from 'sequelize';
import { parse, stringify } from 'yaml';

import { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';

import { buildJobPayload, createRunFromWorkflow } from './createRun';

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

/** 一个单 job 的工作流；没传的字段就不写，用来区分「没声明」和「声明成空值」 */
function workflowPayload(
  options: { runConcurrency?: unknown; jobConcurrency?: unknown; jobNeeds?: string[] } = {},
): string {
  const { runConcurrency, jobConcurrency, jobNeeds = [] } = options;

  const buildJob: Record<string, unknown> = {
    'runs-on': 'ubuntu-latest',
    steps: [{ run: 'echo build' }],
  };
  if (jobNeeds.length > 0) {
    buildJob.needs = jobNeeds;
  }
  if (jobConcurrency !== undefined) {
    buildJob.concurrency = jobConcurrency;
  }

  const jobs: Record<string, unknown> = {};
  for (const needId of jobNeeds) {
    jobs[needId] = { 'runs-on': 'ubuntu-latest', steps: [{ run: `echo ${needId}` }] };
  }
  jobs.build = buildJob;

  return stringify({
    name: 'CI',
    on: 'workflow_dispatch',
    ...(runConcurrency === undefined ? {} : { concurrency: runConcurrency }),
    jobs,
  });
}

/** 上面的 payload 收的是 YAML 文本，这里按 id 把那次 attempt 取回来 */
async function latestAttemptOf(run: ActionRun): Promise<ActionRunAttempt> {
  return (await ActionRunAttempt.findByPk(run.latestAttemptId!))!;
}

describe('createRunFromWorkflow and concurrency', () => {
  // createRun 把 run 固定挂在仓库 1 下，没法像别的测试文件那样拿号段隔开；改成按 run id
  // 精确清理，只删这里建出来的那几行。
  const createdRunIds: number[] = [];

  afterAll(async () => {
    if (createdRunIds.length === 0) {
      return;
    }
    const runIds = { [Op.in]: createdRunIds };
    // 从下往上清（job → attempt → run）：不是每条外键都带级联，顺序反了会删不动
    await ActionRunJob.destroy({ where: { runId: runIds } });
    await ActionRunAttempt.destroy({ where: { runId: runIds } });
    await ActionRun.destroy({ where: { id: runIds } });
  });

  async function create(payloadString: string) {
    const created = await createRunFromWorkflow(payloadString);
    createdRunIds.push(created.run.id);

    return created;
  }

  it('resolves a workflow-level group onto the attempt and starts the jobs', async () => {
    const { run, jobs } = await create(workflowPayload({ runConcurrency: 'run-scalar' }));

    expect(run.rawConcurrency).toBe(JSON.stringify('run-scalar'));
    const attempt = await latestAttemptOf(run);
    expect(attempt.concurrencyGroup).toBe('run-scalar');
    expect(attempt.concurrencyCancel).toBe(false);
    expect(attempt.status).toBe(Status.Waiting);
    expect(jobs[0].status).toBe(Status.Waiting);
  });

  it('reads the cancel flag out of a workflow-level mapping', async () => {
    const { run } = await create(
      workflowPayload({ runConcurrency: { group: 'run-mapping', 'cancel-in-progress': true } }),
    );

    const attempt = await latestAttemptOf(run);
    expect(attempt.concurrencyGroup).toBe('run-mapping');
    expect(attempt.concurrencyCancel).toBe(true);
    expect(run.rawConcurrency).toBe(JSON.stringify({ group: 'run-mapping', 'cancel-in-progress': true }));
  });

  it('leaves a run with no workflow-level group ungrouped', async () => {
    const { run } = await create(workflowPayload());

    expect(run.rawConcurrency).toBe('');
    const attempt = await latestAttemptOf(run);
    expect(attempt.concurrencyGroup).toBe('');
    expect(attempt.status).toBe(Status.Waiting);
  });

  it('treats a concurrency key with no value as no concurrency at all', async () => {
    // YAML 里 `concurrency:` 单独一行解析成 null，上游的 nil 判断也跳过它
    const { run } = await create(workflowPayload({ runConcurrency: null }));

    expect(run.rawConcurrency).toBe('');
    const attempt = await latestAttemptOf(run);
    expect(attempt.concurrencyGroup).toBe('');
  });

  it('blocks every job of a run whose group another run is holding', async () => {
    const holder = await create(workflowPayload({ runConcurrency: 'run-held' }));
    expect(holder.run.rawConcurrency).toBe(JSON.stringify('run-held'));

    // 光有 waiting 的运行不算占住组：得真有 runner 把 job 领起来
    await ActionRunJob.updateRunJob(holder.jobs[0], { status: Status.Running });

    const { run, jobs } = await create(workflowPayload({ runConcurrency: 'run-held' }));

    const attempt = await latestAttemptOf(run);
    expect(attempt.status).toBe(Status.Blocked);
    expect(jobs[0].status).toBe(Status.Blocked);
    // 先到的那次 attempt 还在跑，组仍归它
    expect((await latestAttemptOf(holder.run)).status).toBe(Status.Running);
  });

  it('rejects a workflow-level concurrency node it cannot read', async () => {
    await expect(createRunFromWorkflow(workflowPayload({ runConcurrency: 123 }))).rejects.toThrow(
      /workflow concurrency cannot be read/,
    );
  });

  it('resolves a job-level group at creation when the job has no needs', async () => {
    const { jobs } = await create(
      workflowPayload({ jobConcurrency: { group: 'job-free', 'cancel-in-progress': false } }),
    );

    const job = jobs[0];
    expect(job.rawConcurrency).toBe(JSON.stringify({ group: 'job-free', 'cancel-in-progress': false }));
    expect(job.concurrencyGroup).toBe('job-free');
    expect(job.concurrencyCancel).toBe(false);
    expect(job.isConcurrencyEvaluated).toBe(true);
    expect(job.status).toBe(Status.Waiting);
  });

  it('leaves a job whose group is taken blocked', async () => {
    const holder = await create(workflowPayload({ jobConcurrency: { group: 'job-taken' } }));
    // 组里得有 running 的持有者才挡得住后来者
    holder.jobs[0].status = Status.Running;
    await holder.jobs[0].save();

    const { jobs } = await create(workflowPayload({ jobConcurrency: { group: 'job-taken' } }));

    expect(jobs[0].status).toBe(Status.Blocked);
    expect(jobs[0].isConcurrencyEvaluated).toBe(true);
  });

  it('leaves a job that reads its needs unresolved and blocked', async () => {
    // 组要等 setup 结束才可能被求值，那是 job emitter 的活儿
    const { jobs } = await create(workflowPayload({ jobNeeds: ['setup'], jobConcurrency: { group: 'job-needs' } }));

    const job = jobs.find((candidate) => candidate.jobId === 'build')!;
    expect(job.rawConcurrency).toBe(JSON.stringify({ group: 'job-needs' }));
    expect(job.isConcurrencyEvaluated).toBe(false);
    expect(job.concurrencyGroup).toBe('');
    expect(job.status).toBe(Status.Blocked);
  });

  it('rejects a job-level concurrency node it cannot read, without leaving a run behind', async () => {
    const before = await ActionRun.count();

    await expect(createRunFromWorkflow(workflowPayload({ jobConcurrency: 123 }))).rejects.toThrow(
      /concurrency cannot be read/,
    );

    expect(await ActionRun.count()).toBe(before);
  });
});
