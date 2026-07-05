import { ActionSchedule, ActionScheduleSpec } from '@/models/actions';

// needs mock
vi.mock('./schedule');
vi.mock('./schedule_spec');

it('ddd', async () => {
  // console.log('sequelize', sequelize);
  console.log('ActionScheduleSpec', await ActionSchedule.findAll());

  const rows = await ActionScheduleSpec.findAll();
  console.log('rows', rows);
});
