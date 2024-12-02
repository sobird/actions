import { ActionsSchedule } from '@/models/actions';

vi.mock('./schedule');
// vi.mock('./run');

it('ddd', async () => {
  const rows = await ActionsSchedule.findAll();
  console.log('rows', rows);
});
