import { CreationAttributes } from 'sequelize';

import ActionsRun from '../run';

vi.mock('@/lib/sequelize');

const seed = [
  {
    id: 192,
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

    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
  {
    id: 193,
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

    status: 1,
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
] as CreationAttributes<ActionsRun>[];

beforeAll(async () => {
  await ActionsRun.sync({ force: true });
  await ActionsRun.bulkCreate(seed);
});

export default ActionsRun;
