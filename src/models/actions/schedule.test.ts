import { ActionSchedule } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./schedule');
vi.mock('./schedule_spec');

describe('ActionSchedule', () => {
  it('findAll returns the schedules the fixture seeds', async () => {
    const schedules = await ActionSchedule.findAll({ order: [['id', 'ASC']] });

    expect(schedules.map((schedule) => schedule.title)).toEqual(['schedule title 1111', 'schedule title 2']);
  });

  it('findByIds returns only the rows asked for', async () => {
    const schedules = await ActionSchedule.findByIds([2]);

    expect(schedules.map((schedule) => schedule.id)).toEqual([2]);
  });

  it('lists the specs attached to a schedule', async () => {
    const schedule = await ActionSchedule.findOne({ where: { title: 'schedule title 1111' } });
    const specs = await schedule!.getScheduleSpecs();

    // fixture 的两条 spec 都挂在第一条 schedule 上
    expect(specs.map((spec) => spec.spec).toSorted()).toEqual(['30 5 * * 1,3', '30 5 * * 2,4']);
  });
});
