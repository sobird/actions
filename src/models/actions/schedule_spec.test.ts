import { ActionsSchedule, ActionsScheduleSpec } from '@/models/actions';

// needs mock
vi.mock('./schedule');
vi.mock('./schedule_spec');

it('ddd', async () => {
  // console.log('sequelize', sequelize);
  console.log('ActionsScheduleSpec', await ActionsSchedule.findAll());

  const rows = await ActionsScheduleSpec.findAll();
  console.log('rows', rows);
});
