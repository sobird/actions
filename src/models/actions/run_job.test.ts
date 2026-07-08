import { ActionRunJob } from '@/models/actions';

vi.mock('./run_job');
// vi.mock('./run');

it('ddd', async () => {
  const actionRunJob = await ActionRunJob.findOne();
  console.log('rows', await actionRunJob?.getActionRun());
});
