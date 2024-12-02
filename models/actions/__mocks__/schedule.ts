import { CreationAttributes } from 'sequelize';

import ActionsSchedule from '../schedule';

const seeds = [
  {
    title: 'schedule title 1',
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

await ActionsSchedule.sync({ force: true });
await ActionsSchedule.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionsSchedule;
