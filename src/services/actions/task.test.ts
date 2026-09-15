import { Op } from 'sequelize';

import { ActionRun, ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';

import { resolveBlockedJobs, resolveNeeds, type DependencyJob } from './task';

function dep(jobId: string, status: Status, continueOnError = false): DependencyJob {
  return { jobId, status, continueOnError };
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
  let runId: number;
  let repositoryId: number;

  afterAll(async () => {
    // Jobs go with the run: their foreign key cascades.
    await ActionRun.destroy({ where: { repositoryId: { [Op.gte]: firstRepositoryId } } });
  });

  function add(jobId: string, status: Status, needs: string[] = [], continueOnError = false) {
    return ActionRunJob.create({
      runId,
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

    runId = Number(run.id);
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
