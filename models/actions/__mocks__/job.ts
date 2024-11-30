import { CreationAttributes } from 'sequelize';

import ActionsJob from '../job';
import ActionsRun from '../run';
import ActionsTask from '../task';

vi.mock('../run');
vi.mock('../task');

const seed = [
  {
    id: 192,
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
    id: 193,
    runId: 792,
    ownerId: 1,
    repositoryId: 4,
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: 0,
    name: 'job_2',
    attempt: 1,
    job_id: 'job_2',
    taskId: 48,
    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
] as CreationAttributes<ActionsJob>[];

beforeAll(async () => {
  // associate
  // ActionsRun.associate({ Job: ActionsJob } as any);
  // ActionsJob.associate({ Run: ActionsRun, Task: ActionsTask } as any);

  const rows = await ActionsRun.findAll();
  console.log('rows', rows);

  await ActionsJob.sync({ force: true });
  await ActionsJob.bulkCreate(seed);
});

export default ActionsJob;
