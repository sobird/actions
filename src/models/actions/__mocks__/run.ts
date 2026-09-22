import { ActionRun, type ActionRunCreationAttributes } from '../run';
import { Status } from '../status';

const seeds: ActionRunCreationAttributes[] = [
  {
    id: 791n,
    ownerId: 1,
    repositoryId: 4,
    title: 'update actions',
    workflowId: 'artifact.yaml',
    index: 187,
    triggerUserId: 1n,
    ref: 'refs/heads/master',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    eventName: 'push',
    isForkPullRequest: false,
    needApproval: false,
    approvedBy: 0n,
    // 指向 `__mocks__/run_attempt.ts` 里挂在本 run 上的那次 attempt
    latestAttemptId: 2001n,

    status: Status.Unknown,
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
  },
  {
    id: 792n,
    title: 'update actions',
    ownerId: 1,
    repositoryId: 4,
    workflowId: 'artifact.yaml',
    index: 188,
    triggerUserId: 1n,
    ref: 'refs/heads/master',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    eventName: 'push',
    needApproval: false,
    approvedBy: 0n,

    status: Status.Waiting,
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
  },
];

await ActionRun.sync({ force: true });
await ActionRun.bulkCreate(seeds, { individualHooks: true, validate: true });

export { ActionRun };
