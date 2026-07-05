import { ActionRunJob } from '@/models/actions';

vi.mock('./job');
// vi.mock('./run');

it('ddd', async () => {
  const actionRunJob = await ActionRunJob.findOne();
  console.log('rows', await actionRunJob?.getActionRun());
});
