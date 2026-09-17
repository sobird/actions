import { UniqueConstraintError } from 'sequelize';

import { ActionRun } from '@/models/actions';

import { Status } from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run');
vi.mock('./run_job');

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
    const jobs = await run!.getActionRunJobs();

    expect(jobs.map((job) => Number(job.id))).toEqual([192]);
  });
});
