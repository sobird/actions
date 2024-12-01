import { ActionsTask, ActionsRunner } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./runner');
// vi.mock('./job');

it('ActionsTask Test', async () => {
  // const actionsRunner = await ActionsRunner.findAll();
  // console.log('actionsRunner', actionsRunner);

  const rows = await ActionsTask.findOne();
  console.log('rows', Object.keys(rows.__proto__));

  const runner = await rows.getActionsRunner();
  console.log('runner', runner);
});
