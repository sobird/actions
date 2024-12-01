import { ActionsRun } from '@/models/actions';

vi.mock('./run');
vi.mock('./job');

it('ActionsRun Test', async () => {
  const rows = await ActionsRun.findOne();
  console.log('rows', await rows?.getActionsJobs());
});
