import { CreationAttributes } from 'sequelize';

import { ActionRunJob } from '../run_job';

vi.mock('@/lib/sequelize');
vi.mock('../run');
vi.mock('../task');

const seeds = [
  {
    id: BigInt(192),
    runId: 791,
    ownerId: 1,
    repositoryId: 4,
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    name: 'job_2',
    attempt: 1,
    jobId: 'job_2',
    taskId: 47,
    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
  {
    id: BigInt(193),
    runId: 792,
    ownerId: 1,
    repositoryId: 4,
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    name: 'job_2',
    attempt: 1,
    jobId: 'job_2',
    taskId: 48,
    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
] as CreationAttributes<ActionRunJob>[];

await ActionRunJob.sync({ force: true });
await ActionRunJob.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionRunJob;
