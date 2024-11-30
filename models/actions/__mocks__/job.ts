import { CreationAttributes } from 'sequelize';

import ActionsJob from '../job';
import ActionsRun from '../run';

vi.mock('@/lib/sequelize');

const seed = [
  {
    id: 192,
    runId: 791,
    taskId: 47,
    ownerId: 1,
    repositoryId: 4,
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    name: 'job_2',
    attempt: 1,
    jobId: 'job_2',
    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
  {
    id: 193,
    runId: 792,
    taskId: 48,
    ownerId: 1,
    repositoryId: 4,
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: 0,
    name: 'job_2',
    attempt: 1,
    job_id: 'job_2',
    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
] as CreationAttributes<ActionsJob>[];

beforeAll(async () => {
  await ActionsRun.sync({ force: true });
  await ActionsJob.sync({ force: true });
  await ActionsJob.bulkCreate(seed);
});

export default ActionsJob;
