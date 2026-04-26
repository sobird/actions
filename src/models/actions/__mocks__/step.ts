import { CreationAttributes } from 'sequelize';

import ActionsStep from '../step';

const seeds = [
  {
    id: 1,
    name: 'run some',
    taskId: 47,
    index: 2,
    repositoryId: 4,
    logIndex: 1,
    logLength: 707,
    status: '6',
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
  {
    id: 2,
    name: 'echo some',
    taskId: 48,
    index: 3,
    repositoryId: 4,
    logIndex: 1,
    logLength: 707,
    status: '6',
    started: new Date(1683636528000),
    stopped: new Date(1683636626000),
  },
] as CreationAttributes<ActionsStep>[];

await ActionsStep.sync({ force: true });
await ActionsStep.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionsStep;
