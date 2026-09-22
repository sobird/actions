import { Op } from 'sequelize';

import { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models';
import type { ActionRunJobCreationAttributes } from '@/models/actions/run_job';
import { Status } from '@/models/actions/status';

import { prepareToStartJobWithConcurrency, shouldBlockJobByConcurrency } from './clear_tasks';

// 分组是仓库内的，所以同组的 run 必须落在同一个仓库；每个用例独占一个
const firstRepositoryId = 9400;
// 上界封死：这个库同时被别的测试文件写着，清理不能伸到它们的号段
const repositoryIds = { [Op.between]: [firstRepositoryId, firstRepositoryId + 99] } as const;
let repositoryId: number;
let nextRepositoryId = firstRepositoryId;

/** 每个 job 在它那次 attempt 里领一个序号，口径同 createRun */
let nextAttemptJobId = 0;

function newAttemptJobId() {
  return (nextAttemptJobId += 1);
}

beforeEach(() => {
  repositoryId = nextRepositoryId;
  nextRepositoryId += 1;
});

afterAll(async () => {
  // 从下往上清（job → attempt → run）：不是每条外键都带级联，顺序反了会删不动
  await ActionRunJob.destroy({ where: { repositoryId: repositoryIds } });
  await ActionRunAttempt.destroy({ where: { repositoryId: repositoryIds } });
  await ActionRun.destroy({ where: { repositoryId: repositoryIds } });
});

/** 一次 run 加它那次 attempt；attempt 是 job 归属和「组里有没有人在跑」的共同载体 */
async function addRun(
  index: number,
  attempt: { status?: Status; concurrencyGroup?: string; concurrencyCancel?: boolean } = {},
) {
  const run = await ActionRun.create({
    title: 'clear_tasks',
    ownerId: 1,
    repositoryId,
    workflowId: 'test',
    index,
    ref: 'refs/heads/master',
    commitSha: '',
    eventName: 'workflow_dispatch',
    status: Status.Waiting,
    isForkPullRequest: false,
    needApproval: false,
  });

  const created = await ActionRunAttempt.create({
    runId: run.id,
    repositoryId,
    attempt: 1,
    triggerUserId: 0,
    status: Status.Waiting,
    concurrencyGroup: '',
    concurrencyCancel: false,
    ...attempt,
  });

  run.latestAttemptId = created.id;
  await run.save();

  return { runId: run.id, attemptId: created.id };
}

function add(
  run: { runId: number; attemptId: number },
  jobId: string,
  overrides: Partial<ActionRunJobCreationAttributes> = {},
) {
  return ActionRunJob.create({
    runId: run.runId,
    runAttemptId: run.attemptId,
    attemptJobId: newAttemptJobId(),
    ownerId: 1,
    repositoryId,
    name: jobId,
    commitSha: '',
    isForkPullRequest: false,
    attempt: 1,
    jobId,
    taskId: 0,
    status: Status.Waiting,
    startedAt: null,
    stoppedAt: null,
    ...overrides,
  });
}

/** 一个组已求值、名字为 shared 的 job */
function grouped(overrides: Partial<ActionRunJobCreationAttributes> = {}) {
  return {
    rawConcurrency: JSON.stringify('shared'),
    isConcurrencyEvaluated: true,
    concurrencyGroup: 'shared',
    ...overrides,
  };
}

describe('shouldBlockJobByConcurrency', () => {
  it('blocks a job whose raw concurrency has not been resolved yet', async () => {
    // 求值发生在 job emitter 里，还没轮到它；组可能还要引用别的 job，因此先挡住
    const run = await addRun(1);
    const job = await add(run, 'build', { rawConcurrency: JSON.stringify('shared') });

    await expect(shouldBlockJobByConcurrency(job)).resolves.toBe(true);
  });

  it('does not block a job that names no group', async () => {
    const holderRun = await addRun(1, { status: Status.Running, concurrencyGroup: 'shared' });
    await add(holderRun, 'holder', { concurrencyGroup: 'shared' });
    const run = await addRun(2);
    const job = await add(run, 'free', { isConcurrencyEvaluated: true });

    await expect(shouldBlockJobByConcurrency(job)).resolves.toBe(false);
  });

  it('does not block a job whose group cancels its peers instead of queueing behind them', async () => {
    const holderRun = await addRun(1, { status: Status.Running, concurrencyGroup: 'shared' });
    await add(holderRun, 'holder', { concurrencyGroup: 'shared' });
    const run = await addRun(2);
    const job = await add(run, 'replacing', grouped({ concurrencyCancel: true }));

    await expect(shouldBlockJobByConcurrency(job)).resolves.toBe(false);
  });

  it('blocks a job behind a running attempt of the same group', async () => {
    // workflow 级的组挂在 attempt 上，没有对应的 job 行
    await addRun(1, { status: Status.Running, concurrencyGroup: 'shared' });
    const run = await addRun(2);
    const job = await add(run, 'build', grouped());

    await expect(shouldBlockJobByConcurrency(job)).resolves.toBe(true);
  });

  it('blocks a job behind a running job of the same group', async () => {
    const holderRun = await addRun(1);
    await add(holderRun, 'holder', grouped({ status: Status.Running }));
    const run = await addRun(2);
    const job = await add(run, 'build', grouped());

    await expect(shouldBlockJobByConcurrency(job)).resolves.toBe(true);
  });

  it('does not block a job whose group only holds finished jobs', async () => {
    const holderRun = await addRun(1, { status: Status.Success, concurrencyGroup: 'shared' });
    await add(holderRun, 'holder', grouped({ status: Status.Success }));
    const run = await addRun(2);
    const job = await add(run, 'build', grouped());

    await expect(shouldBlockJobByConcurrency(job)).resolves.toBe(false);
  });
});

describe('prepareToStartJobWithConcurrency', () => {
  it('starts the job when its group is free', async () => {
    const run = await addRun(1);
    const job = await add(run, 'build', grouped());

    await expect(prepareToStartJobWithConcurrency(job)).resolves.toBe(Status.Waiting);
  });

  it('holds the job back while the group is taken', async () => {
    await addRun(1, { status: Status.Running, concurrencyGroup: 'shared' });
    const run = await addRun(2);
    const job = await add(run, 'build', grouped());

    await expect(prepareToStartJobWithConcurrency(job)).resolves.toBe(Status.Blocked);
  });

  it('cancels the pending peers of the group even when the job itself has to wait', async () => {
    const holderRun = await addRun(1, { status: Status.Running, concurrencyGroup: 'shared' });
    const peerRun = await addRun(2);
    const peer = await add(peerRun, 'peer', grouped());
    const run = await addRun(3);
    const job = await add(run, 'build', grouped());

    await expect(prepareToStartJobWithConcurrency(job)).resolves.toBe(Status.Blocked);

    await peer.reload();
    expect(peer.status).toBe(Status.Cancelled);
    expect(peer.stoppedAt).not.toBeNull();

    // 挡着组的那次 attempt 没被牵连
    const holderAttempt = (await ActionRunAttempt.findByPk(holderRun.attemptId))!;
    expect(holderAttempt.status).toBe(Status.Running);
  });

  it('leaves a peer that a runner has already claimed alone', async () => {
    // cancel-in-progress 把 running 也圈进待取消集合，但本地没有服务端取消路径：
    // 带 task 的 job 停不下来，新 job 只是不等它
    const peerRun = await addRun(1);
    const peer = await add(peerRun, 'peer', grouped({ status: Status.Running, taskId: 42 }));
    const run = await addRun(2);
    const job = await add(run, 'build', grouped({ concurrencyCancel: true }));

    await expect(prepareToStartJobWithConcurrency(job)).resolves.toBe(Status.Waiting);

    await peer.reload();
    expect(peer.status).toBe(Status.Running);
    expect(peer.taskId).toBe(42);
  });
});
