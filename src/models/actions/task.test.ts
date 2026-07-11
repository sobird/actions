import { ActionTask, ActionRunner } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./task_step');
vi.mock('./runner');

const actionTask = await ActionTask.findOne();
const steps = await actionTask?.getActionTaskSteps({
  order: [['index', 'ASC']],
});
console.log('steps', steps);

describe('ActionTask Test', async () => {
  // const runner = await rows.getActionRunner();
  // console.log('runner', runner);

  it('createForRunner', async () => {
    console.log('actionsRunner', ActionRunner);
    const actionsRunner = await ActionRunner.findByPk(1);

    if (actionsRunner) {
      const rows = await ActionTask.createForRunner(actionsRunner);
      console.log('rows', rows);
    }
  });
});
