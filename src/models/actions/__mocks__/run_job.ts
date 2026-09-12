import { ActionRunJob, type ActionRunJobCreationAttributes } from '../run_job';
import { Status } from '../status';

const seeds: ActionRunJobCreationAttributes[] = [
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
    status: Status.Success,
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
    status: Status.Success,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
];

await ActionRunJob.sync({ force: true });
await ActionRunJob.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionRunJob;
