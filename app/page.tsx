import Link from 'next/link';

import { ActionTask } from '@/models';

import styles from './page.module.css';

// Tasks change as runners report progress, so never serve a cached render.
export const dynamic = 'force-dynamic';

interface StatusStyle {
  icon: string;
  className: string;
}

const statusStyles: Record<string, StatusStyle> = {
  waiting: { icon: '○', className: styles.waiting },
  running: { icon: '●', className: styles.running },
  success: { icon: '✓', className: styles.success },
  failure: { icon: '✗', className: styles.failure },
  cancelled: { icon: '○', className: styles.cancelled },
  cancelling: { icon: '●', className: styles.cancelling },
  skipped: { icon: '⊘', className: styles.skipped },
};

const fallbackStatusStyle: StatusStyle = { icon: '○', className: styles.waiting };

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateTime(value: Date) {
  return `${pad(value.getMonth() + 1)}/${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatTime(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatMeta(task: ActionTask) {
  const parts = [`#${String(task.id)}`];
  const startedAt = task.startedAt ? new Date(task.startedAt) : null;
  const stoppedAt = task.stoppedAt ? new Date(task.stoppedAt) : null;

  if (startedAt) {
    parts.push(`started ${formatDateTime(startedAt)}`);
  }
  if (stoppedAt) {
    const verb = task.status.toString().startsWith('cancel') ? 'stopped' : 'finished';
    const time = startedAt && isSameDay(startedAt, stoppedAt) ? formatTime(stoppedAt) : formatDateTime(stoppedAt);
    parts.push(`${verb} ${time}`);
  }

  return parts.join(' · ');
}

export default async function Home() {
  const tasks = await ActionTask.findAll({
    order: [['id', 'DESC']],
    limit: 100,
    include: [{ association: 'job', attributes: ['jobId', 'name'] }],
  });

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tasks</h1>
        {tasks.length > 0 && (
          <span className={styles.count}>
            {tasks.length} {tasks.length === 1 ? 'run' : 'runs'}
          </span>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className={styles.empty}>
          No tasks yet. Queue one with <code>actions submit -W &lt;workflow.yml&gt;</code>.
        </p>
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => {
            const status = task.status.toString();
            const statusStyle = statusStyles[status] ?? fallbackStatusStyle;

            return (
              <div key={String(task.id)} className={styles.row}>
                <span className={`${styles.icon} ${statusStyle.className}`} aria-hidden="true">
                  {statusStyle.icon}
                </span>
                <div className={styles.body}>
                  <Link className={styles.job} href={`/log?taskId=${String(task.id)}`}>
                    {task.job?.name || task.job?.jobId || 'unknown'}
                  </Link>
                  <div className={styles.meta}>{formatMeta(task)}</div>
                </div>
                <span className={`${styles.status} ${statusStyle.className}`}>{status}</span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
