/**
 * Run as a runner daemon
 *
 * sobird<i@sobird.me> at 2024/04/25 17:44:32 created.
 */

import { Command } from '@commander-js/extra-typings';
import { ConnectError, Code } from '@connectrpc/connect';
import log4js from 'log4js';

import { Config, Labels, Client } from '@/pkg';
import docker from '@/pkg/docker';
import Poller from '@/pkg/poller';

const logger = log4js.getLogger();

type Options = ReturnType<typeof daemonCommand.opts>;
type DaemonOptions = Options & {
  config: string
};

async function daemonAction(opts: Options, program: typeof Command.prototype) {
  const options = program.optsWithGlobals<DaemonOptions>();
  const version = program.parent?.version();
  const appname = program.parent!.name();
  const appconf = Config.Load(options.config, appname);

  logger.level = appconf.log.level;
  logger.info('Starting runner daemon');

  let registration = null;

  try {
    registration = appconf.registration;
    if (!registration) {
      logger.error('Registration file not found, please register the runner first');
      return;
    }
  } catch (err) {
    logger.fatal('Failed to load registration file: %w', (err as Error).message);
    return;
  }

  // 优先配置中的labels
  const labels = new Labels(appconf.runner.labels.length > 0 ? appconf.runner.labels : registration.labels);

  if (labels.names().length === 0) {
    logger.warn('No labels configured, runner may not be able to pick up jobs');
  }

  if (labels.requireDocker()) {
    const dockerHost = appconf.runner.containerDaemonSocket;

    if (dockerHost && dockerHost !== '-') {
      process.env.DOCKER_HOST = dockerHost;
    }

    try {
      await docker.ping();
    } catch (err) {
      logger.fatal('Cannot ping the docker daemon, is it running?', (err as Error).message);
      return;
    }
  }

  if (JSON.stringify(registration.labels.sort()) !== JSON.stringify(labels.toStrings().sort())) {
    try {
      registration.save();
    } catch (err) {
      return logger.error('Failed to save runner config:', (err as Error).message);
    }
    logger.info('Labels updated to:', registration.labels);
  }

  try {
    const { RunnerServiceClient } = new Client(
      registration.address,
      registration.token,
      appconf.runner.insecure,
      registration.uuid,
      version,
    );

    const { runner } = await RunnerServiceClient.declare({
      labels: labels.names(),
      version,
    });
    if (runner) {
      logger.info(`Runner: ${runner.name}, with version: ${runner.version}, with labels: ${runner.labels}, declare successfully`);
    }

    const poller = new Poller(RunnerServiceClient, appconf, version);
    poller.poll();
  } catch (err) {
    const connectError = err as ConnectError;
    if (connectError.code === Code.Unimplemented) {
      logger.error('Your Gitea version is too old to support runner declare, please upgrade to v1.21 or later');
      return;
    }
    logger.error('Fail to invoke declare', connectError.message);
  }
}

export const daemonCommand = new Command('daemon')
  .description('run as a runner daemon')
  .action(daemonAction);
