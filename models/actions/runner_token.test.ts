import ActionsRunnerToken from './runner_token';

vi.mock('@/lib/sequelize');

beforeAll(async () => {
  await ActionsRunnerToken.sync({ force: true });

  await ActionsRunnerToken.create({
    ownerId: 1,
    repositoryId: 1,
  });
});

describe('Test Actions Runner Token Model', () => {
  it('findLatestByScope', async () => {
    const result = await ActionsRunnerToken.findAll();
    console.log('result', result);
  });
});
