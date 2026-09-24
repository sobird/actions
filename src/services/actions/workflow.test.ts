import { Op } from 'sequelize';
import { stringify } from 'yaml';

import { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';
import { syncSchema } from '@/test/__helpers__';

import { submitWorkflow } from './workflow';

vi.mock('@/lib/sequelize');

beforeAll(syncSchema);

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

describe('submitWorkflow and concurrency', () => {
  // 这里建出来的 run 固定挂在仓库 1 下，没法像别的测试文件那样拿号段隔开；改成按 run id
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
    const created = await submitWorkflow(payloadString);
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
    await expect(submitWorkflow(workflowPayload({ runConcurrency: 123 }))).rejects.toThrow(
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

    await expect(submitWorkflow(workflowPayload({ jobConcurrency: 123 }))).rejects.toThrow(
      /concurrency cannot be read/,
    );

    expect(await ActionRun.count()).toBe(before);
  });
});
