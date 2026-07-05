import ActionActionRunnerToken from '../runner_token';

vi.mock('@/lib/sequelize');

const seed = [
  {
    ownerId: 1,
    repositoryId: 2,
  },
  {
    ownerId: 1,
    repositoryId: 2,
  },
] as ActionActionRunnerToken[];

beforeAll(async () => {});

await ActionActionRunnerToken.sync({ force: true });
await ActionActionRunnerToken.bulkCreate(seed, { individualHooks: true, validate: true });

export default ActionActionRunnerToken;
