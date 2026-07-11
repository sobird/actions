import { ActionTaskStep, type ActionTaskStepCreationAttributes } from '../task_step';

const seeds: ActionTaskStepCreationAttributes[] = [
  {
    id: 1n,
    name: 'run some',
    taskId: 47,
    index: 2,
    repositoryId: 4,
    logIndex: 1,
    logLength: 707,
    status: '6',
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
  },
  {
    id: 2n,
    name: 'echo some',
    taskId: 47,
    index: 3,
    repositoryId: 4,
    logIndex: 1,
    logLength: 707,
    status: '6',
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
  },
];

await ActionTaskStep.sync({ force: true });
await ActionTaskStep.bulkCreate(seeds, { individualHooks: true, validate: true });

export * from '../task_step';
