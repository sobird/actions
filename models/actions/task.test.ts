import { ActionsTask } from '@/models/actions';

vi.mock('./task');

it('ActionsTask Test', async () => {
  // const actionsRunner = await ActionsRunner.findAll();
  // console.log('actionsRunner', actionsRunner);

  const rows = await ActionsTask.findAll();
  console.log('rows', rows);
});
