import { CreationAttributes } from 'sequelize';

import ActionsRunner from '../runner';

vi.mock('@/lib/sequelize');

const seeds = [
  {
    id: 1,
    name: 'test runner name',
    ownerId: 1,
    repositoryId: 4,
    version: '0.0.1',
    labels: ['ubuntu-latest=actions/runner-images:ubuntu-latest'],
  },
  {
    name: 'runner name2',
    ownerId: 1,
    repositoryId: 4,
    version: '0.0.1',
    labels: ['ubuntu-latest=actions/runner-images:ubuntu-latest'],
  },
] as CreationAttributes<ActionsRunner>[];

beforeAll(async () => {

});

await ActionsRunner.sync({ force: true });
await ActionsRunner.bulkCreate(seeds);

export default ActionsRunner;
