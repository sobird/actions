import { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models/actions';

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
