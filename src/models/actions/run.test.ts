import { UniqueConstraintError } from 'sequelize';

import { ActionRun, ActionRunJob } from '@/models/actions';

import { Status } from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run');
vi.mock('./run_job');
vi.mock('./run_attempt');

/** fixture 把 run 791/792 和 job 192/193 配成一对，这里顺着这条链断言 */
const SEEDED_RUN_ID = 791;

describe('ActionRun', () => {
  describe('status', () => {
    it('reads a status back as the Status singleton it was written with', async () => {
      const unknown = await ActionRun.findOne({ where: { status: Status.Unknown.toString() } });
      const waiting = await ActionRun.findOne({ where: { status: Status.Waiting.toString() } });

      expect(unknown?.status).toBe(Status.Unknown);
      expect(waiting?.status).toBe(Status.Waiting);
    });

    it('writes a status as its name', async () => {
      const run = await ActionRun.create({
        title: '',
        ownerId: 1,
        repositoryId: 5,
        workflowId: 'ci.yaml',
        index: 2,
        ref: 'refs/heads/master',
        commitSha: 'a'.repeat(40),
        eventName: 'push',
        status: Status.Waiting,
      });

      await run.update({ status: Status.Failure });

      expect(run.getDataValue('status')).toBe('failure');
      expect(run.status).toBe(Status.Failure);
    });
  });

  it('applies the column defaults on create', async () => {
    const run = await ActionRun.create({
      title: '',
      ownerId: 1,
      repositoryId: 5,
      workflowId: 'ci.yaml',
      index: 1,
      ref: 'refs/heads/master',
      commitSha: 'a'.repeat(40),
      eventName: 'push',
    });

    expect(run.status).toBe(Status.Unknown);
    expect(run.isForkPullRequest).toBe(false);
    expect(run.needApproval).toBe(false);
    expect(run.isScopedRun).toBe(false);
    expect(run.workflowRepoId).toBe(0);
    expect(run.workflowCommitSha).toBe('');
    expect(run.version).toBe(0);
    expect(run.latestAttemptId).toBe(0);
  });

  it('rejects a second run with the same index in one repository', async () => {
    const duplicate = {
      title: '',
      ownerId: 1,
      repositoryId: 4,
      workflowId: 'artifact.yaml',
      index: 187,
      ref: 'refs/heads/master',
      commitSha: 'b'.repeat(40),
      eventName: 'push',
    };

    await expect(ActionRun.create(duplicate)).rejects.toThrow(UniqueConstraintError);
  });

  it('lists the jobs belonging to the run', async () => {
    const run = await ActionRun.findByPk(SEEDED_RUN_ID);
    const jobs = await run!.getJobs();

    expect(jobs.map((job) => Number(job.id))).toEqual([192]);
  });

  it('lists only the attempts of the run, and reads back the latest as a pointer', async () => {
    const run = await ActionRun.findByPk(SEEDED_RUN_ID);

    const attempts = await run!.getAttempts();
    expect(attempts.map((attempt) => Number(attempt.id))).toEqual([2001]);

    const latest = await run!.getLatestAttempt();
    expect(Number(latest!.id)).toBe(2001);
  });

  it('resolves the attempt a job belongs to', async () => {
    const job = await ActionRunJob.findByPk(192);
    const attempt = await job!.getRunAttempt();

    expect(Number(attempt!.id)).toBe(2001);
  });

  describe('refreshStatus', () => {
    it('recomputes the run from the jobs of the attempt it reports as latest', async () => {
      const run = (await ActionRun.findByPk(SEEDED_RUN_ID))!;

      await run.refreshStatus(Status.Unknown);

      expect(run.status).toBe(Status.Success);
      const stored = (await ActionRun.findByPk(SEEDED_RUN_ID))!;
      expect(stored.status).toBe(Status.Success);
    });

    it('settles a run whose latest attempt holds no job as the given status', async () => {
      const run = (await ActionRun.findByPk(SEEDED_RUN_ID))!;
      // 2002 挂的是 run 792，791 名下没有它的 job，所以这次聚合为空集
      run.latestAttemptId = 2002n;

      await run.refreshStatus(Status.Skipped);

      expect(run.status).toBe(Status.Skipped);
    });

    it('keeps the times a run already has instead of clearing them', async () => {
      const run = (await ActionRun.findByPk(SEEDED_RUN_ID))!;
      run.latestAttemptId = 2002n;

      await run.refreshStatus(Status.Waiting);

      expect(run.startedAt).toEqual(new Date(1683636528000));
      expect(run.stoppedAt).toEqual(new Date(1683636626000));
    });
  });
});
