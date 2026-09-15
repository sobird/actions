import { timestampDate } from '@bufbuild/protobuf/wkt';
import { NextRequest, NextResponse } from 'next/server';

import Log from '@/log';
import { ActionTask, ActionTaskStep } from '@/models';

const DefaultLimit = 256 * 1024;
const MaxLimit = 4 * 1024 * 1024;

/**
 * Read a slice of a task's log.
 *
 * Rows are returned with the byte offset to resume from, so a client can poll
 * for the tail while the task is still running.
 */
export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  const task = await ActionTask.findByPk(id);
  if (!task) {
    return NextResponse.json({ error: `task ${id} not found` }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const parsedOffset = Number(searchParams.get('offset') ?? 0);
  const parsedLimit = Number(searchParams.get('limit') ?? DefaultLimit);
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MaxLimit) : DefaultLimit;

  const logSize = task.logSize ?? 0;
  let rows: { time: string; content: string }[] = [];
  let nextOffset = Math.min(offset, logSize);

  // The log file only exists once the runner has written the first row.
  if (logSize > 0 && offset < logSize) {
    const result = await Log.read(task.logFilename, offset, limit, task.logInStorage);
    nextOffset = result.nextOffset;
    rows = result.rows.map((row) => ({
      time: row.time ? timestampDate(row.time).toISOString() : '',
      content: row.content,
    }));
  }

  const steps = await ActionTaskStep.findAll({
    where: { taskId: Number(task.id) },
    order: [['index', 'ASC']],
  });

  return NextResponse.json({
    task: {
      id: String(task.id),
      jobId: task.jobId,
      status: task.status.toString(),
      startedAt: task.startedAt,
      stoppedAt: task.stoppedAt,
      logLength: task.logLength,
      logSize,
      logInStorage: task.logInStorage,
    },
    rows,
    nextOffset,
    more: nextOffset < logSize,
    steps: steps.map((step) => ({
      index: step.index,
      name: step.name,
      logIndex: step.logIndex,
      logLength: step.logLength,
      status: step.status,
    })),
  });
};
