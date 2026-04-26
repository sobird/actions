import { ActionsJob } from '@/models/actions';

vi.mock('./job');
// vi.mock('./run');

it('ddd', async () => {
  const actionsJob = await ActionsJob.findOne();
  console.log('rows', await actionsJob?.getActionsRun());
});
