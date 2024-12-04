import { ActionsSchedule } from '@/models/actions';
import { Workflow } from '@/pkg';

vi.mock('@/lib/sequelize');
vi.mock('./schedule');

const scheduleWorkflow = Workflow.Read('./test/data/workflows/on.schedule.yml');

console.log('scheduleWorkflow.on', scheduleWorkflow.events);
const push = scheduleWorkflow.onEvent('push');
console.log('push', push);

if (typeof scheduleWorkflow.on === 'object') {
  if (typeof scheduleWorkflow.on.push === 'object') {
    console.log('first', scheduleWorkflow.on.push.branches);
  }
}
console.log('scheduleWorkflow.onEvent', scheduleWorkflow.onEvent('push'));

it('ddd', async () => {
  const rows = await ActionsSchedule.findOne();
  // console.log('rows', rows.__proto__);
});
