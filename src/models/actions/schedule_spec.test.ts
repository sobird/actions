import { ActionSchedule, ActionScheduleSpec } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./schedule');
vi.mock('./schedule_spec');

describe('ActionScheduleSpec', () => {
  it('returns every spec of a schedule with its cron expression', async () => {
    const specs = await ActionScheduleSpec.findAll({ where: { scheduleId: 1 } });

    expect(specs.map((spec) => spec.spec)).toEqual(['30 5 * * 1,3', '30 5 * * 2,4']);
    expect(specs.map((spec) => spec.repositoryId)).toEqual([4, 4]);
  });

  it('findByIds looks specs up by primary key', async () => {
    const specs = await ActionScheduleSpec.findByIds([1]);

    expect(specs.map((spec) => spec.spec)).toEqual(['30 5 * * 1,3']);
  });

  it('resolves the schedule a spec belongs to', async () => {
    const spec = (await ActionScheduleSpec.findOne({ where: { spec: '30 5 * * 2,4' } }))!;

    // associate 里写了 as: 'schedule'，sequelize 生成的就是 getSchedule
    const schedule = await spec.getSchedule();

    expect(schedule.id).toBe(1);
    expect(schedule.title).toBe('schedule title 1111');
  });

  it('lists the specs from the schedule side of the association', async () => {
    const schedule = (await ActionSchedule.findOne({ where: { title: 'schedule title 1111' } }))!;

    const specs = await schedule.getScheduleSpecs();

    expect(specs.map((spec) => spec.spec)).toEqual(['30 5 * * 1,3', '30 5 * * 2,4']);
  });
});
