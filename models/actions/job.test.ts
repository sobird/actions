import { ActionsJob } from '@/models/actions';

vi.mock('./job');
// vi.mock('./run');

it('ddd', async () => {
  console.log('ActionsJob', ActionsJob);
  const rows = await ActionsJob.findAll();
  console.log('rows', rows);
});
