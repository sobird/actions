import { ActionsTask, ActionsRunner } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./runner');
vi.mock('./job');
vi.mock('./step');

describe('ActionsTask Test', async () => {
  // const runner = await rows.getActionsRunner();
  // console.log('runner', runner);

  it('createForRunner', async () => {
    const actionsRunner = await ActionsRunner.findByPk(1);

    if (actionsRunner) {
      const rows = await ActionsTask.createForRunner(actionsRunner);
      console.log('rows', rows);
    }
  });
});
