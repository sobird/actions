import { Op } from 'sequelize';

import { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models';
import type { ActionRunJobCreationAttributes } from '@/models/actions/run_job';
import { Status } from '@/models/actions/status';

import { resolveBlockedJobs, resolveNeeds, type DependencyJob } from './job_emitter';

function dep(jobId: string, status: Status, continueOnError = false): DependencyJob {
  return { jobId, status, continueOnError };
}

/** 每个 job 在它那次 attempt 里领一个序号，口径同 createRun */
let nextAttemptJobId = 0;

function newAttemptJobId() {
  return (nextAttemptJobId += 1);
}

describe('resolveNeeds', () => {
  it('is ready when there is nothing to wait for', () => {
    expect(resolveNeeds([], [])).toBe('ready');
  });

  it('is ready once every cell of every dependency is done', () => {
    const dependencies = [dep('build', Status.Success), dep('build', Status.Success), dep('setup', Status.Success)];

    expect(resolveNeeds(['build', 'setup'], dependencies)).toBe('ready');
  });

  it('waits while any cell of a dependency is unfinished', () => {
    const dependencies = [dep('build', Status.Success), dep('build', Status.Running)];

    expect(resolveNeeds(['build'], dependencies)).toBe('pending');
  });

  it('waits for a dependency the run does not carry', () => {
    expect(resolveNeeds(['build', 'setup'], [dep('build', Status.Success)])).toBe('pending');
  });

  it('waits rather than failing while a later cell could still finish', () => {
    const dependencies = [dep('build', Status.Failure), dep('build', Status.Running)];

    expect(resolveNeeds(['build'], dependencies)).toBe('pending');
  });

  it('fails when a cell failed', () => {
    const dependencies = [dep('build', Status.Success), dep('build', Status.Failure)];

    expect(resolveNeeds(['build'], dependencies)).toBe('failed');
  });

  it('fails when a cell was cancelled or skipped', () => {
    expect(resolveNeeds(['build'], [dep('build', Status.Cancelled)])).toBe('failed');
    expect(resolveNeeds(['build'], [dep('build', Status.Skipped)])).toBe('failed');
  });

  it('ignores a failure the cell continues on error', () => {
    const dependencies = [dep('build', Status.Success), dep('build', Status.Failure, true)];

    expect(resolveNeeds(['build'], dependencies)).toBe('ready');
  });
});

describe('resolveBlockedJobs', () => {
  // Every case gets its own run and repository so the rows cannot see each other.
  const firstRepositoryId = 9100;
  // Bounded so the cleanup cannot reach a band another test file is using, which runs
  // concurrently against the same database.
  const repositoryIds = { [Op.between]: [firstRepositoryId, firstRepositoryId + 99] } as const;
  let runId: number;
  let runAttemptId: number;
  let repositoryId: number;

  afterAll(async () => {
    // 从下往上清（job → attempt → run）：不是每条外键都带级联，顺序反了会删不动
    await ActionRunJob.destroy({ where: { repositoryId: repositoryIds } });
    await ActionRunAttempt.destroy({ where: { repositoryId: repositoryIds } });
    await ActionRun.destroy({ where: { repositoryId: repositoryIds } });
  });

  function add(jobId: string, status: Status, needs: string[] = [], continueOnError = false) {
    return ActionRunJob.create({
      runId,
      runAttemptId,
      attemptJobId: newAttemptJobId(),
      ownerId: 1,
      repositoryId,
      name: jobId,
      commitSha: '',
      isForkPullRequest: false,
      attempt: 1,
      jobId,
      taskId: 0,
      needs: JSON.stringify(needs),
      status,
      continueOnError,
      startedAt: null,
      stoppedAt: null,
    });
  }

  async function statusesOf() {
    const jobs = await ActionRunJob.findAll({ where: { runId }, order: [['id', 'ASC']] });
    return jobs.map((job) => job.status.toString());
  }

  beforeEach(async () => {
    const index = repositoryId ? repositoryId - firstRepositoryId + 2 : 1;
    repositoryId = firstRepositoryId + index - 1;

    const run = await ActionRun.create({
      title: 'resolveBlockedJobs',
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

    const attempt = await ActionRunAttempt.create({
      runId: run.id,
      repositoryId,
      attempt: 1,
      triggerUserId: 0,
      status: Status.Waiting,
      concurrencyGroup: '',
      concurrencyCancel: false,
    });

    runId = run.id;
    runAttemptId = attempt.id;
  });

  it('reports nothing to do when no job is blocked', async () => {
    await add('setup', Status.Success);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(false);
    expect(await statusesOf()).toEqual(['success']);
  });

  it('starts a job whose dependency succeeded', async () => {
    await add('setup', Status.Success);
    await add('build', Status.Blocked, ['setup']);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(true);
    expect(await statusesOf()).toEqual(['success', 'waiting']);
  });

  it('skips a job whose dependency failed', async () => {
    await add('setup', Status.Failure);
    await add('build', Status.Blocked, ['setup']);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(false);
    expect(await statusesOf()).toEqual(['failure', 'skipped']);
  });

  it('leaves a job blocked while a dependency is unfinished', async () => {
    await add('setup', Status.Running);
    await add('build', Status.Blocked, ['setup']);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(false);
    expect(await statusesOf()).toEqual(['running', 'blocked']);
  });

  it('leaves a job blocked while only some of its dependency cells are done', async () => {
    await add('build', Status.Success);
    await add('build', Status.Running);
    await add('deploy', Status.Blocked, ['build']);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(false);
    expect(await statusesOf()).toEqual(['success', 'running', 'blocked']);
  });

  it('holds a job back when one of its dependency cells failed', async () => {
    await add('build', Status.Success);
    await add('build', Status.Failure);
    await add('deploy', Status.Blocked, ['build']);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(false);
    expect(await statusesOf()).toEqual(['success', 'failure', 'skipped']);
  });

  it('starts a job when the only failed cell continues on error', async () => {
    await add('build', Status.Success);
    await add('build', Status.Failure, [], true);
    await add('deploy', Status.Blocked, ['build']);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(true);
    expect(await statusesOf()).toEqual(['success', 'failure', 'waiting']);
  });

  it('skips a whole chain behind a failure, however it is ordered', async () => {
    // declared furthest-first, so the chain can only resolve over several passes
    await add('deploy', Status.Blocked, ['build']);
    await add('build', Status.Blocked, ['setup']);
    await add('setup', Status.Failure);

    await expect(resolveBlockedJobs(runId)).resolves.toBe(false);
    expect(await statusesOf()).toEqual(['skipped', 'skipped', 'failure']);
  });
});

describe('resolveBlockedJobs and concurrency groups', () => {
  // 分组是仓库内的，所以同组的 run 必须落在同一个仓库；每个用例独占一个
  const firstRepositoryId = 9300;
  // Bounded for the same reason as the describe above.
  const repositoryIds = { [Op.between]: [firstRepositoryId, firstRepositoryId + 99] } as const;
  let repositoryId: number;
  let nextRepositoryId = firstRepositoryId;

  beforeEach(() => {
    repositoryId = nextRepositoryId;
    nextRepositoryId += 1;
  });

  afterAll(async () => {
    await ActionRunJob.destroy({ where: { repositoryId: repositoryIds } });
    await ActionRunAttempt.destroy({ where: { repositoryId: repositoryIds } });
    await ActionRun.destroy({ where: { repositoryId: repositoryIds } });
  });

  async function addRun(index: number, concurrencyGroup = '', concurrencyCancel = false) {
    const run = await ActionRun.create({
      title: 'concurrency',
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

    const attempt = await ActionRunAttempt.create({
      runId: run.id,
      repositoryId,
      attempt: 1,
      triggerUserId: 0,
      status: Status.Waiting,
      concurrencyGroup,
      concurrencyCancel,
    });

    run.latestAttemptId = attempt.id;
    await run.save();

    return { runId: run.id, attemptId: attempt.id };
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
      status: Status.Blocked,
      startedAt: null,
      stoppedAt: null,
      ...overrides,
    });
  }

  it('keeps a ready job blocked while another run holds its group', async () => {
    const holderRun = await addRun(1);
    const waiterRun = await addRun(2);
    await add(holderRun, 'holder', { status: Status.Running, concurrencyGroup: 'shared' });
    const waiter = await add(waiterRun, 'waiter', { rawConcurrency: JSON.stringify('shared') });

    await expect(resolveBlockedJobs(waiterRun.runId)).resolves.toBe(false);

    await waiter.reload();
    expect(waiter.status).toBe(Status.Blocked);
    // 组还没解开，但求值本身成功了，就先把结果落到列上，免得下一轮再算一遍
    expect(waiter.isConcurrencyEvaluated).toBe(true);
    expect(waiter.concurrencyGroup).toBe('shared');
  });

  it('starts a ready job once the group is free', async () => {
    const holderRun = await addRun(1);
    const waiterRun = await addRun(2);
    await add(holderRun, 'holder', { status: Status.Success, concurrencyGroup: 'shared' });
    const waiter = await add(waiterRun, 'waiter', { rawConcurrency: JSON.stringify('shared') });

    await expect(resolveBlockedJobs(waiterRun.runId)).resolves.toBe(true);

    await waiter.reload();
    expect(waiter.status).toBe(Status.Waiting);
  });

  it('cancels the pending peers the started job supersedes', async () => {
    const peerRun = await addRun(1);
    const startRun = await addRun(2);
    const peer = await add(peerRun, 'peer', { status: Status.Waiting, concurrencyGroup: 'shared' });
    const started = await add(startRun, 'started', {
      rawConcurrency: JSON.stringify({ group: 'shared', 'cancel-in-progress': false }),
    });

    await expect(resolveBlockedJobs(startRun.runId)).resolves.toBe(true);

    await peer.reload();
    expect(peer.status).toBe(Status.Cancelled);
    await started.reload();
    expect(started.status).toBe(Status.Waiting);

    // 同伴那次 attempt 也跟着它一起收尾
    const peerAttempt = (await ActionRunAttempt.findByPk(peerRun.attemptId))!;
    expect(peerAttempt.status).toBe(Status.Cancelled);
  });

  it('leaves a running peer alone when the group does not cancel in progress', async () => {
    const holderRun = await addRun(1);
    const waiterRun = await addRun(2);
    const holder = await add(holderRun, 'holder', { status: Status.Running, concurrencyGroup: 'shared' });
    const waiter = await add(waiterRun, 'waiter', {
      rawConcurrency: JSON.stringify({ group: 'shared', 'cancel-in-progress': false }),
    });

    await expect(resolveBlockedJobs(waiterRun.runId)).resolves.toBe(false);

    await holder.reload();
    expect(holder.status).toBe(Status.Running);
    await waiter.reload();
    expect(waiter.status).toBe(Status.Blocked);
  });

  it('leaves a claimed peer running even when the group cancels in progress', async () => {
    // 本地没有服务端取消路径：带 task 的 job 停不下来，新 job 只是不等它
    const claimedRun = await addRun(1);
    const startRun = await addRun(2);
    const claimed = await add(claimedRun, 'claimed', {
      status: Status.Running,
      taskId: 42,
      concurrencyGroup: 'shared',
    });
    const started = await add(startRun, 'started', {
      rawConcurrency: JSON.stringify({ group: 'shared', 'cancel-in-progress': true }),
    });

    await expect(resolveBlockedJobs(startRun.runId)).resolves.toBe(true);

    await claimed.reload();
    expect(claimed.status).toBe(Status.Running);
    expect(claimed.taskId).toBe(42);
    await started.reload();
    expect(started.status).toBe(Status.Waiting);
  });

  it('leaves a job blocked when its raw concurrency is neither a group nor a mapping', async () => {
    const run = await addRun(1);
    const broken = await add(run, 'broken', { rawConcurrency: JSON.stringify(123) });

    await expect(resolveBlockedJobs(run.runId)).resolves.toBe(false);

    await broken.reload();
    expect(broken.status).toBe(Status.Blocked);
    expect(broken.isConcurrencyEvaluated).toBe(false);
  });
});
