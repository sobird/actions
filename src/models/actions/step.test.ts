import { ActionStep } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./step');
vi.mock('./task');

it('ActionStep Test', async () => {
  // const actionsRunner = await ActionRunner.findAll();
  // console.log('actionsRunner', actionsRunner);

  const rows = await ActionStep.findOne();
  console.log('rows', await rows?.getActionTask());

  // const runner = await rows.getActionRunner();
  // console.log('runner', runner);
});
