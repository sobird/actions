/**
 * Run as a runner daemon
 *
 * sobird<i@sobird.me> at 2024/04/25 17:44:32 created.
 */

import { ConnectError, Code } from '@connectrpc/connect';
import { Command } from 'commander';

import logger from '@/common/logger';
import { getConfig, loadRegistration, saveRegistration, Registration } from '@/config';
import docker from '@/docker';
import { Labels, Client } from '@/index';
import Poller, { Runner } from '@/poller';

export const daemonCommand = new Command<[], {}, { config: string }>('daemon')
  .description('run as a runner daemon')
  .option('--capacity <number>', 'Execute how many tasks concurrently at the same time', parseInt)
  .option('--insecure', 'Whether skip verifying the TLS certificate of the Server instance')
  .option('--timeout <number>', 'The timeout for a job to be finished', parseInt)
  .option('--fetch-timeout <number>', 'The timeout for fetching the job from the server instance', parseInt)
  .option('--fetch-interval <number>', 'The interval for fetching the job from the server instance', parseInt)
  .action(async (opts, program) => {
    const options = program.optsWithGlobals();
    const version = program.parent?.version();
    const appname = program.parent!.name();

    const config = getConfig(appname, {
      daemon: options,
    });

    logger.level = config.log.level;
    logger.info('Starting runner daemon');

    let registration: Registration;
    try {
      registration = loadRegistration(config.runner.file);
      if (!registration) {
        logger.error('Registration file not found, please register the runner first');
        return;
      }
    } catch (err) {
      logger.error('Failed to load registration file: %s', (err as Error).message);
      return;
    }

    // 优先配置中的labels
    const labels = new Labels(config.runner.labels.length > 0 ? config.runner.labels : registration.labels);

    if (labels.names().length === 0) {
      logger.warn('No labels configured, runner may not be able to pick up jobs');
    }

    if (labels.requireDocker()) {
      const dockerHost = config.runner.containerDaemonSocket;

      if (dockerHost && dockerHost !== '-') {
        process.env.DOCKER_HOST = dockerHost;
      }

      try {
        await docker.ping();
      } catch {
        logger.error('Cannot ping the docker daemon, is it running?');
        return;
      }
    }

    if (JSON.stringify(registration.labels.toSorted()) !== JSON.stringify(labels.toStrings().toSorted())) {
      try {
        registration.labels = labels.toStrings();
        saveRegistration(registration);
      } catch (err) {
        logger.error('Failed to save runner config:');
        logger.debug((err as Error).message);
        return;
      }
      logger.info(`Labels updated to: ${registration.labels}`);
    }

    try {
      const { RunnerServiceClient } = new Client(
        registration.address,
        registration.token,
        config.daemon.insecure,
        registration.uuid,
        version,
      );

      const { runner } = await RunnerServiceClient.declare({
        labels: labels.names(),
        version,
      });
      if (runner) {
        logger.info(
          `Runner: ${runner.name}, with version: ${runner.version}, with labels: ${runner.labels}, declare successfully`,
        );
      }

      const poller = new Poller(RunnerServiceClient, config, new Runner(RunnerServiceClient, config, labels), version);
      poller.poll();
    } catch (err) {
      const connectError = err as ConnectError;
      if (connectError.code === Code.Unimplemented) {
        logger.error('Your Gitea version is too old to support runner declare, please upgrade to v1.21 or later');
        return;
      }
      logger.error(`Fail to invoke declare: ${connectError.message}`);
    }
  });
