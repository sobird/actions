import { ActionRunnerToken, type ActionRunnerTokenCreationAttributes } from '../runner_token';

const seed: ActionRunnerTokenCreationAttributes[] = [
  {
    ownerId: 0,
    repositoryId: 1,
  },
  {
    ownerId: 1,
    repositoryId: 2,
  },
  {
    ownerId: 1,
    repositoryId: 2,
  },
];

await ActionRunnerToken.sync({ force: true });
await ActionRunnerToken.bulkCreate(seed, { individualHooks: true, validate: true });

export { ActionRunnerToken };
