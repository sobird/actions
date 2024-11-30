import { CreationAttributes } from 'sequelize';

import ActionsJob from '../job';
import ActionsRunner from '../runner';
import ActionsTask from '../task';

// vi.mock('@/lib/sequelize');
vi.mock('../runner');
vi.mock('../job');

const seed = [
  {
    id: 47,
    jobId: 192,
    attempt: 3,
    runnerId: 1,
    status: 6, // 6 is the status code for "running", running task can upload artifacts
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
    repositoryId: 4,
    ownerId: 1,
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    logFilename: 'artifact-test2/2f/47.log',
    logInStorage: true,
    logLength: 707,
    logSize: 90179,
    logExpired: false,
  },
] as CreationAttributes<ActionsTask>[];

beforeAll(async () => {
  ActionsRunner.associate({ Task: ActionsTask } as any);

  await ActionsTask.sync({ force: true });
  await ActionsTask.bulkCreate(seed);
});

export default ActionsTask;
