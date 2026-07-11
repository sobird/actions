import { ActionRunnerToken, type ActionRunnerTokenCreationAttributes } from '../runner_token';

const seed: ActionRunnerTokenCreationAttributes[] = [
  {
    ownerId: 1,
    repositoryId: 2,
  },
  {
    ownerId: 1,
    repositoryId: 2,
  },
];

beforeAll(async () => {});

await ActionRunnerToken.sync({ force: true });
await ActionRunnerToken.bulkCreate(seed, { individualHooks: true, validate: true });

export default ActionRunnerToken;
