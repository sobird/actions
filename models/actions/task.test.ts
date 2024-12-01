import { ActionsTask, ActionsRunner } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./runner');
vi.mock('./job');
vi.mock('./step');

it('ActionsTask Test', async () => {
  // const actionsRunner = await ActionsRunner.findAll();
  // console.log('actionsRunner', actionsRunner);

  const rows = await ActionsTask.findOne();
  console.log('rows', await rows?.getActionsSteps());

  // const runner = await rows.getActionsRunner();
  // console.log('runner', runner);
});
