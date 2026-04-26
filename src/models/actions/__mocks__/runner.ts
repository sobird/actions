import { CreationAttributes } from 'sequelize';

import ActionsRunner from '../runner';

const seeds = [
  {
    id: 1,
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
] as CreationAttributes<ActionsRunner>[];

await ActionsRunner.sync({ force: true });
await ActionsRunner.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionsRunner;
