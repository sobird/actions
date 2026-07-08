import { ActionStep, type ActionStepCreationAttributes } from '../step';

const seeds: ActionStepCreationAttributes[] = [
  {
    id: 1n,
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
    id: 2n,
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
];

await ActionStep.sync({ force: true });
await ActionStep.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionStep;
