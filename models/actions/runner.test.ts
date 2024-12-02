import { ActionsRunner } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./runner');

const rows = await ActionsRunner.findOne();
console.log('rows', rows?.get());

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

  it('isOnline', async () => {
    const runner = await ActionsRunner.findByPk(1);
    if (runner) {
      runner.lastOnline = new Date();
    }

    expect(runner?.isOnline).toBeTruthy();
  });
});
