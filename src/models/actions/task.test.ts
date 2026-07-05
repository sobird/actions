import { ActionTask, ActionRunner } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./runner');
vi.mock('./job');
vi.mock('./step');

describe('ActionTask Test', async () => {
  // const runner = await rows.getActionRunner();
  // console.log('runner', runner);

  it('createForRunner', async () => {
    const actionsRunner = await ActionRunner.findByPk(1);

    if (actionsRunner) {
      const rows = await ActionTask.createForRunner(actionsRunner);
      console.log('rows', rows);
    }
  });
});
