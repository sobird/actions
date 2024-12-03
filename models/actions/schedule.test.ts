import { ActionsSchedule } from '@/models/actions';
import { Workflow } from '@/pkg';

vi.mock('@/lib/sequelize');
vi.mock('./schedule');

const scheduleWorkflow = Workflow.Read('./test/data/workflows/on.schedule.yml');

// console.log('scheduleWorkflow', scheduleWorkflow.on);
console.log('scheduleWorkflow', scheduleWorkflow.dump());

it('ddd', async () => {
  const rows = await ActionsSchedule.findOne();
  // console.log('rows', rows.__proto__);
});
