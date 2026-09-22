import { ActionRun, ActionRunAttempt, ActionRunJob, ActionTaskVersion } from '@/models/actions';

import type { ActionRunJobCreationAttributes } from './run_job';
import { Status } from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run_job');
vi.mock('./run');
vi.mock('./run_attempt');
vi.mock('./task');

// The aggregation reads only the status and the continue-on-error flag, so a bare
// object stands in for the row.
function createJob(status: Status, continueOnError: boolean): ActionRunJob {
  return { status, continueOnError } as unknown as ActionRunJob;
}

describe('aggregateStatus', () => {
  const testCases = [
    {
      name: 'no job leaves the status unknown',
      jobs: [],
      want: Status.Unknown,
    },
    {
      name: 'all success',
      jobs: [createJob(Status.Success, false), createJob(Status.Success, false)],
      want: Status.Success,
    },
    {
      name: 'one failure without continue-on-error',
      jobs: [createJob(Status.Success, false), createJob(Status.Failure, false)],
      want: Status.Failure,
    },
    {
      name: 'one failure with continue-on-error',
      jobs: [createJob(Status.Success, false), createJob(Status.Failure, true)],
      want: Status.Success,
    },
    {
      name: 'only continued-failure',
      jobs: [createJob(Status.Failure, true)],
      want: Status.Success,
    },
    {
      name: 'continued-failure plus real failure',
      jobs: [createJob(Status.Failure, true), createJob(Status.Failure, false)],
      want: Status.Failure,
    },
    {
      name: 'all skipped',
      jobs: [createJob(Status.Skipped, false), createJob(Status.Skipped, false)],
      want: Status.Skipped,
    },
    {
      name: 'continued-failure plus skipped counts as success',
      jobs: [createJob(Status.Failure, true), createJob(Status.Skipped, false)],
      want: Status.Success,
    },
    {
      name: 'waiting outranks blocked',
      jobs: [createJob(Status.Blocked, false), createJob(Status.Waiting, false)],
      want: Status.Waiting,
    },
    {
      name: 'blocked is still pending',
      jobs: [createJob(Status.Blocked, false)],
      want: Status.Blocked,
    },
    {
      name: 'running outranks waiting',
      jobs: [createJob(Status.Waiting, false), createJob(Status.Running, false)],
      want: Status.Running,
    },
    {
      name: 'cancelled outranks failure',
      jobs: [createJob(Status.Failure, false), createJob(Status.Cancelled, false)],
      want: Status.Cancelled,
    },
    {
      name: 'unfinished jobs leave the status unknown',
      jobs: [createJob(Status.Unknown, false)],
      want: Status.Unknown,
    },
  ];

  testCases.forEach(({ name, jobs, want }) => {
    it(name, () => {
      expect(ActionRunJob.aggregateStatus(jobs)).toBe(want);
    });
  });
});

describe('updateRunJob', () => {
  it('carries a job status onto its attempt and onto its run', async () => {
    const job = (await ActionRunJob.findByPk(192))!;

    await ActionRunJob.updateRunJob(job, { status: Status.Failure });

    const attempt = (await ActionRunAttempt.findByPk(2001))!;
    expect(attempt.status).toBe(Status.Failure);

    const run = (await ActionRun.findByPk(791))!;
    expect(run.status).toBe(Status.Failure);
  });

  it('keeps the times the attempt and the run already have instead of clearing them', async () => {
    const job = (await ActionRunJob.findByPk(192))!;

    await ActionRunJob.updateRunJob(job, { status: Status.Success });

    const attempt = (await ActionRunAttempt.findByPk(2001))!;
    expect(attempt.startedAt).toEqual(new Date(1683636528000));
    expect(attempt.stoppedAt).toEqual(new Date(1683636626000));

    const run = (await ActionRun.findByPk(791))!;
    expect(run.startedAt).toEqual(new Date(1683636528000));
    expect(run.stoppedAt).toEqual(new Date(1683636626000));
  });

  it('updates only the attempt when the run has a later one', async () => {
    // job 193 挂在 run 792 的 attempt 2002 上，而 792 没有指向它的 latestAttempt
    const job = (await ActionRunJob.findByPk(193))!;

    await ActionRunJob.updateRunJob(job, { status: Status.Failure });

    const attempt = (await ActionRunAttempt.findByPk(2002))!;
    expect(attempt.status).toBe(Status.Failure);

    const run = (await ActionRun.findByPk(792))!;
    expect(run.status).toBe(Status.Waiting);
  });
});

describe('cancelOneJob', () => {
  it('leaves a job that has already finished alone', async () => {
    const job = (await ActionRunJob.findByPk(192))!;

    await expect(ActionRunJob.cancelOneJob(job)).resolves.toBeNull();

    const stored = (await ActionRunJob.findByPk(192))!;
    expect(stored.status).toBe(Status.Success);
  });

  it('cancels an unclaimed job and settles its attempt and run', async () => {
    const run = await ActionRun.create({
      title: '',
      ownerId: 1,
      repositoryId: 4,
      workflowId: 'ci.yaml',
      index: 900,
      ref: 'refs/heads/master',
      commitSha: 'a'.repeat(40),
      eventName: 'push',
      status: Status.Waiting,
    });
    const attempt = await ActionRunAttempt.create({
      runId: run.id,
      repositoryId: 4,
      attempt: 1,
      triggerUserId: 0,
      status: Status.Waiting,
      concurrencyGroup: '',
      concurrencyCancel: false,
    });
    run.latestAttemptId = attempt.id;
    await run.save();

    const job = await ActionRunJob.create({
      runId: run.id,
      runAttemptId: attempt.id,
      attemptJobId: 1,
      ownerId: 1,
      repositoryId: 4,
      name: 'job_2',
      commitSha: '',
      isForkPullRequest: false,
      attempt: 1,
      jobId: 'job_2',
      taskId: 0,
      status: Status.Waiting,
      startedAt: null,
      stoppedAt: null,
    });

    await expect(ActionRunJob.cancelOneJob(job)).resolves.not.toBeNull();

    await job.reload();
    expect(job.status).toBe(Status.Cancelled);
    expect(job.stoppedAt).not.toBeNull();

    const cancelledAttempt = (await ActionRunAttempt.findByPk(attempt.id))!;
    expect(cancelledAttempt.status).toBe(Status.Cancelled);

    const cancelledRun = (await ActionRun.findByPk(run.id))!;
    expect(cancelledRun.status).toBe(Status.Cancelled);
  });
});

// 下面几组用例各自造数据：仓库号自增，断言就只看得见自己那几行

/** 每次状态写入都会顺手 bump 任务版本，这套库也得先有那张表 */
beforeAll(async () => {
  await ActionTaskVersion.sync({ force: true });
});

let nextRepositoryId = 7000;
let nextAttemptJobId = 1;

async function addRun(repositoryId: number) {
  const run = await ActionRun.create({
    title: 'run_job',
    ownerId: 1,
    repositoryId,
    workflowId: 'ci.yaml',
    index: 1,
    ref: 'refs/heads/master',
    commitSha: 'a'.repeat(40),
    eventName: 'push',
    status: Status.Waiting,
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
  run.latestAttemptId = attempt.id;
  await run.save();

  return { run, attempt };
}

function addJob(run: ActionRun, attempt: ActionRunAttempt, overrides: Partial<ActionRunJobCreationAttributes> = {}) {
  return ActionRunJob.create({
    runId: run.id,
    runAttemptId: attempt.id,
    attemptJobId: nextAttemptJobId++,
    ownerId: 1,
    repositoryId: run.repositoryId,
    name: 'job',
    commitSha: '',
    isForkPullRequest: false,
    attempt: 1,
    jobId: 'job',
    taskId: 0,
    status: Status.Waiting,
    startedAt: null,
    stoppedAt: null,
    ...overrides,
  });
}

/** 仓库维度的任务版本号：每次 bump 都会把它加一 */
function repositoryVersion(repositoryId: number) {
  return ActionTaskVersion.findOneVersionByScope(0, repositoryId);
}

describe('updateRunJob gates the aggregate and bumps the task version', () => {
  it('leaves the aggregate alone when the write carries no status', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    // 聚合读出来是 success，而 attempt 和 run 还停在 waiting：重算一次就会露馅
    const job = await addJob(run, attempt, { status: Status.Success });

    await ActionRunJob.updateRunJob(job, { taskId: 99 });

    expect((await ActionRunAttempt.findByPk(attempt.id))!.status).toBe(Status.Waiting);
    expect((await ActionRun.findByPk(run.id))!.status).toBe(Status.Waiting);
  });

  it('bumps the task version when a job goes back to the queue', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const job = await addJob(run, attempt, { status: Status.Running, taskId: 7 });
    const before = await repositoryVersion(repositoryId);

    await ActionRunJob.updateRunJob(job, { status: Status.Waiting });

    expect(await repositoryVersion(repositoryId)).toBe(before + 1n);
  });

  it('does not bump when a finished job leaves nothing to pick up', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const job = await addJob(run, attempt, { status: Status.Running, taskId: 7 });
    const before = await repositoryVersion(repositoryId);

    await ActionRunJob.updateRunJob(job, { status: Status.Success });

    expect(await repositoryVersion(repositoryId)).toBe(before);
  });

  it('bumps when a finished job leaves a waiting job behind', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const job = await addJob(run, attempt, { status: Status.Running, taskId: 7 });
    await addJob(run, attempt, { jobId: 'pending' });
    const before = await repositoryVersion(repositoryId);

    await ActionRunJob.updateRunJob(job, { status: Status.Success });

    expect(await repositoryVersion(repositoryId)).toBe(before + 1n);
  });

  it('does not count a waiting caller as work a runner could pick up', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const job = await addJob(run, attempt, { status: Status.Running, taskId: 7 });
    await addJob(run, attempt, { jobId: 'caller', isReusableCaller: true });
    const before = await repositoryVersion(repositoryId);

    await ActionRunJob.updateRunJob(job, { status: Status.Success });

    expect(await repositoryVersion(repositoryId)).toBe(before);
  });
});

describe('refreshReusableCallerStatus', () => {
  it('leaves a job that is not a caller alone', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const job = await addJob(run, attempt);
    await addJob(run, attempt, { parentJobId: job.id, status: Status.Success });

    await ActionRunJob.refreshReusableCallerStatus(job);

    await job.reload();
    expect(job.status).toBe(Status.Waiting);
  });

  it('settles a caller on the children it expanded into', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true, status: Status.Blocked });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Success });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Success });

    await ActionRunJob.refreshReusableCallerStatus(caller);

    await caller.reload();
    expect(caller.status).toBe(Status.Success);
    expect(caller.stoppedAt).not.toBeNull();
    // 它自己一步都没跑过，就没有开始时间可记
    expect(caller.startedAt).toBeNull();
  });

  it('starts a caller while one of its children is still running', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true, status: Status.Blocked });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Running, taskId: 7 });

    await ActionRunJob.refreshReusableCallerStatus(caller);

    await caller.reload();
    expect(caller.status).toBe(Status.Running);
    expect(caller.startedAt).not.toBeNull();
    expect(caller.stoppedAt).toBeNull();
  });

  it('leaves a caller that was skipped outright without any window', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true, status: Status.Blocked });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Skipped });

    await ActionRunJob.refreshReusableCallerStatus(caller);

    await caller.reload();
    expect(caller.status).toBe(Status.Skipped);
    expect(caller.startedAt).toBeNull();
    expect(caller.stoppedAt).toBeNull();
  });

  it('keeps the stop time a caller already carries', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const stoppedAt = new Date(1700000060000);
    const caller = await addJob(run, attempt, {
      isReusableCaller: true,
      isExpanded: true,
      status: Status.Success,
      stoppedAt,
    });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Success });

    await ActionRunJob.refreshReusableCallerStatus(caller);

    await caller.reload();
    expect(caller.stoppedAt).toEqual(stoppedAt);
  });

  it('keeps the start time a caller already carries', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const startedAt = new Date(1700000000000);
    const caller = await addJob(run, attempt, {
      isReusableCaller: true,
      isExpanded: true,
      startedAt,
    });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Running, taskId: 7 });

    await ActionRunJob.refreshReusableCallerStatus(caller);

    await caller.reload();
    expect(caller.status).toBe(Status.Running);
    expect(caller.startedAt).toEqual(startedAt);
  });

  it('writes nothing when the children leave the caller as it is', async () => {
    const update = vi.spyOn(ActionRunJob, 'update');
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, {
      isReusableCaller: true,
      isExpanded: true,
      status: Status.Success,
      startedAt: new Date(1700000000000),
      stoppedAt: new Date(1700000060000),
    });
    await addJob(run, attempt, { parentJobId: caller.id, status: Status.Success });

    await ActionRunJob.refreshReusableCallerStatus(caller);

    expect(update).not.toHaveBeenCalled();
    update.mockRestore();
  });

  it('carries a child status up through the callers above it', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const outer = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true, status: Status.Blocked });
    const inner = await addJob(run, attempt, {
      isReusableCaller: true,
      isExpanded: true,
      status: Status.Blocked,
      parentJobId: outer.id,
    });
    const child = await addJob(run, attempt, { parentJobId: inner.id, status: Status.Running, taskId: 7 });

    await ActionRunJob.updateRunJob(child, { status: Status.Success });

    await inner.reload();
    expect(inner.status).toBe(Status.Success);
    await outer.reload();
    expect(outer.status).toBe(Status.Success);
    // 链条尽头的那一次写入把 run 也带上了
    expect((await ActionRun.findByPk(run.id))!.status).toBe(Status.Success);
  });
});

/** The walk reads only the two ids, so a bare object stands in for the row. */
function bareJob(id: number, parentJobId: number): ActionRunJob {
  return { id, parentJobId } as unknown as ActionRunJob;
}

describe('collectAllDescendantJobs', () => {
  it('collects the whole subtree however deep and leaves the root out', () => {
    const parent = bareJob(1, 0);
    const child = bareJob(2, 1);
    const grandchild = bareJob(3, 2);
    const outsider = bareJob(4, 0);

    // 孙辈排在父辈前面：迭代到不动点才能把它接上
    const descendants = ActionRunJob.collectAllDescendantJobs(parent, [grandchild, outsider, child, parent]);

    expect(descendants.map((job) => job.id).toSorted()).toEqual([2, 3]);
  });
});

describe('cancelReusableCaller', () => {
  it('cancels the subtree deepest first and then the caller', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true });
    const child = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true, parentJobId: caller.id });
    const grandchild = await addJob(run, attempt, { parentJobId: child.id });

    const cancelled = await ActionRunJob.cancelReusableCaller(caller);

    expect(cancelled.map((job) => job.id)).toEqual([grandchild.id, child.id, caller.id]);
    for (const job of cancelled) {
      expect(job.status).toBe(Status.Cancelled);
      expect(job.stoppedAt).not.toBeNull();
    }
    expect((await ActionRunJob.findByPk(grandchild.id))!.status).toBe(Status.Cancelled);
  });

  it('leaves a claimed child to the runner that owns it', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true });
    const claimed = await addJob(run, attempt, { parentJobId: caller.id, status: Status.Running, taskId: 42 });

    const cancelled = await ActionRunJob.cancelReusableCaller(caller);

    expect(cancelled.map((job) => job.id)).toEqual([caller.id]);
    await claimed.reload();
    expect(claimed.status).toBe(Status.Running);
    expect(claimed.taskId).toBe(42);
  });

  it('skips a descendant that already reached its final state', async () => {
    const repositoryId = nextRepositoryId++;
    const { run, attempt } = await addRun(repositoryId);
    const caller = await addJob(run, attempt, { isReusableCaller: true, isExpanded: true });
    const finished = await addJob(run, attempt, { parentJobId: caller.id, status: Status.Success });
    const pending = await addJob(run, attempt, { parentJobId: caller.id });

    const cancelled = await ActionRunJob.cancelReusableCaller(caller);

    expect(cancelled.map((job) => job.id)).toEqual([pending.id, caller.id]);
    await finished.reload();
    expect(finished.status).toBe(Status.Success);
    expect((await ActionRunJob.findByPk(pending.id))!.status).toBe(Status.Cancelled);
  });
});
