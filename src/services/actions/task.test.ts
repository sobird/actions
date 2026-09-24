import { create } from '@bufbuild/protobuf';
import { Op } from 'sequelize';

import { Result, TaskStateSchema } from '@/gen/runner/v1/messages_pb';
import { ActionRun, ActionRunAttempt, ActionRunJob, ActionRunner, ActionTask, ActionTaskStep } from '@/models';
import type { ActionRunJobCreationAttributes } from '@/models/actions/run_job';
import { Status } from '@/models/actions/status';
import { syncSchema } from '@/test/__helpers__';

import { findWaitingJobs, pickTask, runnerJobScope } from './task';

vi.mock('@/lib/sequelize');

beforeAll(syncSchema);

/** 每个 job 在它那次 attempt 里领一个序号，口径同 createRun */
let nextAttemptJobId = 0;

function newAttemptJobId() {
  return (nextAttemptJobId += 1);
}

/** 只读 ownerId / repositoryId 的 runner，build 出来就够，不必落库 */
function scopeRunner(ownerId: number, repositoryId: number) {
  return ActionRunner.build({ name: 'scope runner', version: '1.0.0', ownerId, repositoryId, labels: [] });
}

describe('runnerJobScope', () => {
  it('scopes a repository runner to its own repository', () => {
    expect(runnerJobScope(scopeRunner(0, 4))).toEqual({ repositoryId: 4 });
  });

  it('scopes an owner runner to everything its owner has', () => {
    expect(runnerJobScope(scopeRunner(7, 0))).toEqual({ ownerId: 7 });
  });

  it('leaves a global runner unscoped', () => {
    expect(runnerJobScope(scopeRunner(0, 0))).toEqual({});
  });
});

describe('findWaitingJobs', () => {
  // 每个用例独占一个仓库，断言就不必再排除别的行
  const firstRepositoryId = 9200;
  // 上界封死到 9249：本文件里 pickTask 用 9250，清理不能伸过去
  const repositoryIds = { [Op.between]: [firstRepositoryId, firstRepositoryId + 49] } as const;
  const ownerId = 9200;
  let nextRepositoryId = firstRepositoryId;

  /** run 到它那次 attempt 的映射：add() 据此给 job 填归属 */
  const attemptIds = new Map<number, number>();

  async function addRepository() {
    const repositoryId = nextRepositoryId;
    nextRepositoryId += 1;

    const run = await ActionRun.create({
      title: 'findWaitingJobs',
      ownerId,
      repositoryId,
      workflowId: 'test',
      index: 1,
      ref: 'refs/heads/master',
      commitSha: '',
      eventName: 'workflow_dispatch',
      status: Status.Waiting,
      isForkPullRequest: false,
      needApproval: false,
    });

    const attempt = await ActionRunAttempt.create({
      runId: run.id,
      repositoryId,
      attempt: 1,
      triggerUserId: 0,
      status: Status.Waiting,
      concurrencyGroup: '',
      concurrencyCancel: false,
    });
    attemptIds.set(run.id, attempt.id);

    return { repositoryId, runId: run.id };
  }

  function add(
    runId: number,
    repositoryId: number,
    jobId: string,
    overrides: Partial<ActionRunJobCreationAttributes> = {},
  ) {
    return ActionRunJob.create({
      runId,
      runAttemptId: attemptIds.get(runId)!,
      attemptJobId: newAttemptJobId(),
      ownerId,
      repositoryId,
      name: jobId,
      commitSha: '',
      isForkPullRequest: false,
      attempt: 1,
      jobId,
      taskId: 0,
      runsOn: JSON.stringify(['ubuntu-latest']),
      status: Status.Waiting,
      startedAt: null,
      stoppedAt: null,
      ...overrides,
    });
  }

  afterAll(async () => {
    // 从下往上清（job → attempt → run）：不是每条外键都带级联，顺序反了会删不动
    await ActionRunJob.destroy({ where: { repositoryId: repositoryIds } });
    await ActionRunAttempt.destroy({ where: { repositoryId: repositoryIds } });
    await ActionRun.destroy({ where: { repositoryId: repositoryIds } });
  });

  it('returns only the waiting jobs no runner has claimed', async () => {
    const { repositoryId, runId } = await addRepository();
    await add(runId, repositoryId, 'running', { status: Status.Running, taskId: 7 });
    await add(runId, repositoryId, 'claimed', { taskId: 8 });
    await add(runId, repositoryId, 'queued');

    const jobs = await findWaitingJobs({ repositoryId });

    expect(jobs.map((job) => job.jobId)).toEqual(['queued']);
  });

  it('narrows a repository scope to that repository and an owner scope to the owner', async () => {
    const first = await addRepository();
    const second = await addRepository();
    const firstJob = await add(first.runId, first.repositoryId, 'first');
    const secondJob = await add(second.runId, second.repositoryId, 'second');

    const byRepository = await findWaitingJobs({ repositoryId: first.repositoryId });
    expect(byRepository.map((job) => job.jobId)).toEqual(['first']);

    // 同一个 owner 名下的两个仓库都在，global 更是全都看得到
    const expected = expect.arrayContaining([firstJob.id, secondJob.id]);
    expect((await findWaitingJobs({ ownerId })).map((job) => job.id)).toEqual(expected);
    expect((await findWaitingJobs({})).map((job) => job.id)).toEqual(expected);
  });

  it('pages through the waiting jobs without skipping one', async () => {
    const { repositoryId, runId } = await addRepository();
    const first = await add(runId, repositoryId, 'a');
    const second = await add(runId, repositoryId, 'b');
    const third = await add(runId, repositoryId, 'c');

    const pageOne = await findWaitingJobs({ repositoryId }, undefined, 2);
    expect(pageOne.map((job) => job.jobId)).toEqual(['a', 'b']);

    const last = pageOne[pageOne.length - 1];
    const pageTwo = await findWaitingJobs({ repositoryId }, { updatedAt: last.updatedAt, id: last.id }, 2);
    expect(pageTwo.map((job) => job.jobId)).toEqual(['c']);

    expect([...pageOne, ...pageTwo].map((job) => job.id)).toEqual([first.id, second.id, third.id]);
  });
});

/** 认领用例自带一套 runner 和仓库，免得扫到别的测试甚至真实数据 */
const PICK_REPOSITORY_ID = 9250;
const PICK_OWNER_ID = 9250;

/** pickTask 要装配载荷，所以 job 的 workflowPayload 得能解析出它自己那个 job */
const WORKFLOW_PAYLOAD = `
jobs:
  healthy:
    runs-on: ubuntu-latest
    steps:
      - run: echo healthy
  broken:
    runs-on: ubuntu-latest
    steps:
      - run: echo broken
`;

function claimedTaskOf(job: ActionRunJob) {
  return ActionTask.findOne({ where: { jobId: job.id } });
}

describe('pickTask', () => {
  let runner: ActionRunner;
  let runId: number;
  let attempt: ActionRunAttempt;
  let nextRunIndex = 0;

  async function addRun() {
    nextRunIndex += 1;

    const run = await ActionRun.create({
      title: 'pickTask',
      ownerId: PICK_OWNER_ID,
      repositoryId: PICK_REPOSITORY_ID,
      workflowId: 'test',
      index: nextRunIndex,
      ref: 'refs/heads/master',
      commitSha: '',
      eventName: 'workflow_dispatch',
      status: Status.Waiting,
      isForkPullRequest: false,
      needApproval: false,
    });

    const created = await ActionRunAttempt.create({
      runId: run.id,
      repositoryId: PICK_REPOSITORY_ID,
      attempt: 1,
      triggerUserId: 0,
      status: Status.Waiting,
      concurrencyGroup: '',
      concurrencyCancel: false,
    });
    run.latestAttemptId = created.id;
    await run.save();

    return { runId: run.id, attempt: created };
  }

  function queueJob(jobId: string, overrides: Partial<ActionRunJobCreationAttributes> = {}) {
    return ActionRunJob.create({
      runId,
      runAttemptId: attempt.id,
      attemptJobId: newAttemptJobId(),
      ownerId: PICK_OWNER_ID,
      repositoryId: PICK_REPOSITORY_ID,
      name: jobId,
      commitSha: '',
      isForkPullRequest: false,
      attempt: 1,
      workflowPayload: Buffer.from(WORKFLOW_PAYLOAD),
      jobId,
      taskId: 0,
      runsOn: JSON.stringify(['ubuntu-latest']),
      status: Status.Waiting,
      startedAt: null,
      stoppedAt: null,
      ...overrides,
    });
  }

  async function finish(job: ActionRunJob, result: Result) {
    const task = (await claimedTaskOf(job))!;
    return ActionTask.updateByState(runner.id, create(TaskStateSchema, { id: BigInt(task.id), result }));
  }

  beforeAll(async () => {
    runner = await ActionRunner.create({
      name: 'pickTask runner',
      version: '1.0.0',
      ownerId: 0,
      repositoryId: PICK_REPOSITORY_ID,
      labels: ['ubuntu-latest'],
    });
  });

  beforeEach(async () => {
    const created = await addRun();
    runId = created.runId;
    attempt = created.attempt;
  });

  afterEach(async () => {
    // 没被认领的候选留到下一个用例还会被再扫一遍，清掉
    await ActionRunJob.destroy({ where: { repositoryId: PICK_REPOSITORY_ID, taskId: 0 } });
  });

  afterAll(async () => {
    // steps 的外键是 NO ACTION，得先清 steps 才能删 task
    const tasks = await ActionTask.findAll({ where: { repositoryId: PICK_REPOSITORY_ID }, attributes: ['id'] });
    await ActionTaskStep.destroy({ where: { taskId: tasks.map((task) => task.id) } });
    await ActionTask.destroy({ where: { repositoryId: PICK_REPOSITORY_ID } });
    await ActionRunJob.destroy({ where: { repositoryId: PICK_REPOSITORY_ID } });
    await ActionRunAttempt.destroy({ where: { repositoryId: PICK_REPOSITORY_ID } });
    await ActionRun.destroy({ where: { repositoryId: PICK_REPOSITORY_ID } });
    await ActionRunner.destroy({ where: { repositoryId: PICK_REPOSITORY_ID } });
  });

  it('claims the waiting job, assembles its payload and flips the run to running', async () => {
    const job = await queueJob('healthy');

    const picked = await pickTask(runner);

    const task = (await claimedTaskOf(job))!;
    expect(picked).not.toBeNull();
    expect(Number(picked!.task.id)).toBe(task.id);
    expect(picked!.task.context?.job).toBe('healthy');
    expect(picked!.task.workflowPayload).toBeInstanceOf(Uint8Array);

    await job.reload();
    expect(job.status).toBe(Status.Running);
    expect(job.taskId).toBe(task.id);
    expect(job.startedAt).not.toBeNull();

    const run = (await ActionRun.findByPk(runId))!;
    expect(run.status).toBe(Status.Running);
    expect(run.startedAt).not.toBeNull();
  });

  it('returns nothing when the queue is empty', async () => {
    await expect(pickTask(runner)).resolves.toBeNull();
  });

  it('skips a job whose workflow payload cannot be read and claims the next candidate', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = await queueJob('broken', { workflowPayload: Buffer.from('') });
    const healthy = await queueJob('healthy');

    const picked = await pickTask(runner);

    expect(picked).not.toBeNull();
    expect(picked!.task.context?.job).toBe('healthy');
    expect(logged).toHaveBeenCalled();

    await healthy.reload();
    expect(healthy.status).toBe(Status.Running);

    // 坏 job 被放回队列，也没留下半成品 task
    await broken.reload();
    expect(broken.status).toBe(Status.Waiting);
    expect(broken.taskId).toBe(0);
    expect(broken.startedAt).toBeNull();
    expect(await claimedTaskOf(broken)).toBeNull();

    logged.mockRestore();
  });

  it('settles the run attempt alongside the run when a job succeeds', async () => {
    const job = await queueJob('healthy');

    await expect(pickTask(runner)).resolves.not.toBeNull();

    await attempt.reload();
    expect(attempt.status).toBe(Status.Running);
    expect(attempt.startedAt).not.toBeNull();

    await finish(job, Result.SUCCESS);

    await attempt.reload();
    expect(attempt.status).toBe(Status.Success);
    expect(attempt.stoppedAt).not.toBeNull();

    const run = (await ActionRun.findByPk(runId))!;
    expect(run.latestAttemptId).toBe(attempt.id);
    expect(run.status).toBe(Status.Success);
    expect(run.stoppedAt).not.toBeNull();
  });

  it('propagates a failed job onto the run as a failure', async () => {
    const job = await queueJob('healthy');

    await expect(pickTask(runner)).resolves.not.toBeNull();
    await finish(job, Result.FAILURE);

    const run = (await ActionRun.findByPk(runId))!;
    expect(run.status).toBe(Status.Failure);
    expect(run.stoppedAt).not.toBeNull();
  });

  it('passes over a reusable caller, which no runner could run', async () => {
    // caller 排在前面，不被跳过的话第一个领走的就是它
    const caller = await queueJob('caller', { isReusableCaller: true });
    const healthy = await queueJob('healthy');

    const picked = await pickTask(runner);

    expect(picked!.task.context?.job).toBe('healthy');
    await healthy.reload();
    expect(healthy.status).toBe(Status.Running);

    await caller.reload();
    expect(caller.taskId).toBe(0);
    expect(caller.status).toBe(Status.Waiting);
  });
});
