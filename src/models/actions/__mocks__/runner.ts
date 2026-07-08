import { ActionRunner, type ActionRunnerCreationAttributes } from '../runner';

const seeds: ActionRunnerCreationAttributes[] = [
  {
    id: 1n,
    name: 'test runner name',
    ownerId: 1,
    repositoryId: 4,
    version: '0.0.1',
    labels: ['ubuntu-latest'],
  },
  {
    name: 'runner name2',
    ownerId: 1,
    repositoryId: 4,
    version: '0.0.1',
    labels: ['ubuntu-latest'],
  },
];

await ActionRunner.sync({ force: true });
await ActionRunner.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionRunner;
