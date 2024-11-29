import ActionsRunner from './runner';

vi.mock('@/lib/sequelize');

beforeAll(async () => {
  await ActionsRunner.sync({ force: true });
});

describe('Test Actions Runner Model', () => {
  it('ActionsRunnerToken.create', async () => {
    const actionsRunner = await ActionsRunner.create({
      name: 'test',
      version: '0.1.1',
      labels: ['ubuntu-latest=actions/runner-images:ubuntu-latest'],
      ownerId: 1,
      repositoryId: 1,
    });
    expect(actionsRunner).not.toBeNull();
  });

  it('verifyToken', async () => {
    const actionsRunner = await ActionsRunner.create({
      name: 'test',
      version: '0.1.1',
      labels: ['ubuntu-latest=actions/runner-images:ubuntu-latest'],
      ownerId: 1,
      repositoryId: 1,
    });

    const verified = actionsRunner.verifyToken(actionsRunner.token);
    expect(verified).toBeTruthy();
  });
});
