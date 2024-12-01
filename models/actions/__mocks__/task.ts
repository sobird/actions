import { CreationAttributes } from 'sequelize';

// import ActionsRunner from '../runner';
import ActionsTask from '../task';

// vi.mock('@/lib/sequelize');
// vi.mock('../runner');
// vi.mock('../job');

const seeds = [
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
  {
    id: 48,
    jobId: 193,
    attempt: 1,
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

});

// console.log('ActionsRunner1212', ActionsRunner);

await ActionsTask.sync({ force: true });
await ActionsTask.bulkCreate(seeds);

export default ActionsTask;
