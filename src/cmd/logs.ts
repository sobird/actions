import { Command } from 'commander';

import logger from '@/common/logger';
import { getConfig, loadRegistration } from '@/config';
import { sleep } from '@/utils';

const FollowInterval = 1000;
const FinalStatuses = new Set(['success', 'failure', 'cancelled', 'skipped']);

interface LogRow {
  time: string;
  content: string;
}

interface LogResult {
  rows?: LogRow[];
  nextOffset?: number;
  more?: boolean;
  task?: { status: string; logInStorage: boolean };
  error?: string;
}

export const logsCommand = new Command('logs')
  .description("print a task's log")
  .argument('<taskId>', 'id of the task')
  .option('-f, --follow', 'keep polling until the task finishes', false)
  .action(async (taskId: string, options: { follow: boolean }, program) => {
    const config = getConfig(program.parent!.name());

    let address: string;
    try {
      address = loadRegistration(config.runner.file).address;
    } catch (err) {
      logger.error(`Failed to load registration file: ${(err as Error).message}`);
      return;
    }
    if (!address) {
      logger.error('No server address in the registration file, please register the runner first');
      return;
    }

    const url = `${address.replace(/\/$/, '')}/api/tasks/${taskId}/logs`;
    let offset = 0;

    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(`${url}?offset=${offset}`);
      // eslint-disable-next-line no-await-in-loop
      const result = (await response.json()) as LogResult;

      if (!response.ok) {
        logger.error(`Failed to read the log: ${result.error ?? response.statusText}`);
        return;
      }

      for (const row of result.rows ?? []) {
        process.stdout.write(`${row.time} ${row.content}\n`);
      }
      offset = result.nextOffset ?? offset;

      if (!options.follow) {
        return;
      }

      const finished = result.task?.logInStorage || FinalStatuses.has(result.task?.status ?? '');
      if (finished && !result.more) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(FollowInterval);
    }
  });
