import { CreationAttributes } from 'sequelize';

import ActionsSchedule from '../schedule';

// needs
vi.mock('@/lib/sequelize');

const seeds = [
  {
    title: 'schedule title 1111',
    ownerId: 1,
    repositoryId: 4,
    workflowId: 'artifact.yaml',
    triggerUserId: 1,
    ref: 'refs/heads/master',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    eventName: 'push',
    content: 'content 1',
  },
  {
    title: 'schedule title 2',
    ownerId: 1,
    repositoryId: 4,
    workflowId: 'artifact.yaml',
    triggerUserId: 1,
    ref: 'refs/heads/master',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: false,
    eventName: 'push',
    content: 'content 2',
  },
] as CreationAttributes<ActionsSchedule>[];

// ActionsSchedule Setup
await ActionsSchedule.sync({ force: true });
await ActionsSchedule.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionsSchedule;
