import { CreationAttributes } from 'sequelize';

import ActionsRun from '../run';
import Status from '../status';

const seeds = [
  {
    id: 791,
    ownerId: 1,
    repositoryId: 4,
    title: 'update actions',
    workflowId: 'artifact.yaml',
    index: 187,
    triggerUserId: 1,
    ref: 'refs/heads/master',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    eventName: 'push',
    isForkPullRequest: false,
    needApproval: false,
    approvedBy: 0,

    status: Status.Unknown,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
  {
    id: 792,
    title: 'update actions',
    ownerId: 1,
    repositoryId: 4,
    workflowId: 'artifact.yaml',
    index: 188,
    triggerUserId: 1,
    ref: 'refs/heads/master',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    eventName: 'push',
    needApproval: false,
    approvedBy: 0,

    status: Status.Waiting,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
] as CreationAttributes<ActionsRun>[];

beforeAll(async () => {

});

await ActionsRun.sync({ force: true });
await ActionsRun.bulkCreate(seeds);

export default ActionsRun;
