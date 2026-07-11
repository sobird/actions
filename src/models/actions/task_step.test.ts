import { ActionTaskStep } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./task_step');

it('ActionTaskStep Test', async () => {
  // const actionsRunner = await ActionRunner.findAll();
  // console.log('actionsRunner', actionsRunner);

  const rows = await ActionTaskStep.findOne();
  console.log('rows', await rows?.getActionTask());

  // const runner = await rows.getActionRunner();
  // console.log('runner', runner);
});
