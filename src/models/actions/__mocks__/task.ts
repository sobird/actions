import { Status } from '../status.ts';
import { ActionTask, type ActionTaskCreationAttributes } from '../task';

const seeds: ActionTaskCreationAttributes[] = [
  {
    id: 47n,
    jobId: 192,
    attempt: 3,
    runnerId: 1n,
    status: Status.Running, // 6 is the status code for "running", running task can upload artifacts
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
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
    id: 48n,
    jobId: 193,
    attempt: 1,
    runnerId: 1n,
    status: Status.Running, // 6 is the status code for "running", running task can upload artifacts
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
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
];

await ActionTask.sync({ force: true });
await ActionTask.bulkCreate(seeds, { individualHooks: true, validate: true });

export * from '../task';
