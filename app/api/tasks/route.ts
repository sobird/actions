import { NextResponse } from 'next/server';

import { ActionTask } from '@/models';

const DefaultLimit = 100;

/** List the most recent tasks, newest first. */
export const GET = async () => {
  const tasks = await ActionTask.findAll({
    order: [['id', 'DESC']],
    limit: DefaultLimit,
    include: [{ association: 'job', attributes: ['jobId', 'name', 'runId'] }],
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      id: String(task.id),
      jobId: task.job?.jobId ?? '',
      name: task.job?.name ?? '',
      status: task.status.toString(),
      startedAt: task.startedAt,
      stoppedAt: task.stoppedAt,
      logLength: task.logLength,
      logInStorage: task.logInStorage,
    })),
  });
};
