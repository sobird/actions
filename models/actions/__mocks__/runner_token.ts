import ActionsRunnerToken from '../runner_token';

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
] as ActionsRunnerToken[];

beforeAll(async () => {
  await ActionsRunnerToken.sync({ force: true });
  await ActionsRunnerToken.bulkCreate(seed);
});

export default ActionsRunnerToken;
