import { ActionsStep } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./step');
vi.mock('./task');

it('ActionsStep Test', async () => {
  // const actionsRunner = await ActionsRunner.findAll();
  // console.log('actionsRunner', actionsRunner);

  const rows = await ActionsStep.findOne();
  console.log('rows', await rows?.getActionsTask());

  // const runner = await rows.getActionsRunner();
  // console.log('runner', runner);
});
