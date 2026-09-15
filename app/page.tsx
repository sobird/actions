import Link from 'next/link';

import { ActionTask } from '@/models';

// Tasks change as runners report progress, so never serve a cached render.
export const dynamic = 'force-dynamic';

const statusStyles: Record<string, string> = {
  waiting: 'bg-zinc-200 text-zinc-800',
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  failure: 'bg-red-100 text-red-800',
  cancelled: 'bg-amber-100 text-amber-800',
  cancelling: 'bg-amber-100 text-amber-800',
  skipped: 'bg-zinc-200 text-zinc-600',
};

function formatTime(value: Date | string | null | undefined) {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleString();
}

export default async function Home() {
  const tasks = await ActionTask.findAll({
    order: [['id', 'DESC']],
    limit: 100,
    include: [{ association: 'job', attributes: ['jobId', 'name'] }],
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Tasks</h1>

      {tasks.length === 0 ? (
        <p className="text-zinc-500">
          No tasks yet. Queue one with <code>actions submit -W &lt;workflow.yml&gt;</code>.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-300 text-zinc-500">
            <tr>
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Job</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Started</th>
              <th className="py-2 pr-4">Stopped</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={String(task.id)} className="border-b border-zinc-200">
                <td className="py-2 pr-4 font-mono">
                  <Link className="hover:underline" href={`/log?taskId=${task.id}`}>
                    {String(task.id)}
                  </Link>
                </td>
                <td className="py-2 pr-4">
                  {task.job?.name || task.job?.jobId || ''}
                  <span className="ml-2 text-zinc-500">{task.job?.jobId}</span>
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      statusStyles[task.status.toString()] ?? 'bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    {task.status.toString()}
                  </span>
                </td>
                <td className="py-2 pr-4">{formatTime(task.startedAt)}</td>
                <td className="py-2 pr-4">{formatTime(task.stoppedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
