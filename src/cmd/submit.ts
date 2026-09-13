import fs from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';

import logger from '@/common/logger';
import { getConfig, loadRegistration } from '@/config';

interface SubmitJob {
  id: string;
  jobId: string;
  name: string;
}

interface SubmitResult {
  runId?: string;
  jobs?: SubmitJob[];
  error?: string;
}

export const submitCommand = new Command('submit')
  .description('submit a local workflow file to the server and queue a run')
  .requiredOption('-W, --workflow <path>', 'path to the workflow yaml file')
  .option('--ref <ref>', 'ref the run is triggered against', 'refs/heads/master')
  .option('--commit-sha <sha>', 'commit sha of the run', '')
  .option('--workdir <path>', 'local checkout the job steps run in, defaults to the current directory')
  .option('--title <title>', 'title of the run, defaults to the workflow file name')
  .action(async (options, program) => {
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

    const file = path.resolve(options.workflow);
    const workflow = fs.readFileSync(file, 'utf8');

    const response = await fetch(`${address.replace(/\/$/, '')}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflow,
        ref: options.ref,
        commitSha: options.commitSha,
        workdir: path.resolve(options.workdir ?? process.cwd()),
        title: options.title ?? path.basename(file),
      }),
    });

    const result = (await response.json()) as SubmitResult;
    if (!response.ok) {
      logger.error(`Failed to queue the run: ${result.error ?? response.statusText}`);
      return;
    }

    logger.info(`Run ${result.runId} queued with ${result.jobs?.length ?? 0} job(s)`);
    result.jobs?.forEach((job) => {
      logger.info(`  #${job.id} ${job.jobId} (${job.name})`);
    });
  });
