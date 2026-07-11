import os from 'node:os';

import { intro, text, password, group, groupMultiselect } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import log4js from 'log4js';

import { getConfig, saveRegistration } from '@/config';
import { Labels, Client } from '@/index';

const logger = log4js.getLogger();
logger.level = 'debug';

type RegisterArgs = ReturnType<typeof registerCommand.opts>;
type RegisterOptions = Required<RegisterArgs> & {
  config?: string;
  version?: string;
};

async function doRegister(options: RegisterOptions) {
  const { instance, token, name, version } = options;
  const labels = new Labels(options.labels);

  const config = getConfig();

  const { PingServiceClient, RunnerServiceClient } = new Client(instance, '', config.daemon.insecure, '', version);

  const pingResponse = await new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    const ping = async () => {
      try {
        const response = await PingServiceClient.ping({
          data: name,
        });
        logger.info('Successfully pinged the instance server');

        clearTimeout(timer);
        resolve(response.data);
      } catch (err) {
        logger.fatal('Cannot ping the instance server:', (err as Error).message);
        timer = setTimeout(ping, 1000);
      }
    };
    ping();
  });
  logger.debug(pingResponse);

  try {
    const { runner } = await RunnerServiceClient.register({
      name,
      token,
      labels: labels.names(),
      agentLabels: labels.names(),
      version,
    });

    if (runner) {
      saveRegistration({
        id: runner.id,
        uuid: runner.uuid,
        name: runner.name,
        token: runner.token,
        address: instance,
        labels: runner.labels,
      });

      logger.info('Runner registered successfully.');
    }
  } catch (err) {
    logger.fatal('Failed to register runner:', (err as Error).message);
  }
}

export const registerCommand = new Command<[], {}, { config?: string }>('register')
  .description('register a runner to the server')
  .option('-i, --instance <addr>', 'Actions instance address')
  .option('-t, --token <token>', 'Runner token')
  .option('-n, --name <name>', 'Runner name')
  .option('-l, --labels <labels>', 'Runner labels, comma separated', (value) => {
    return value.split(',');
  })
  .action(async (options, program) => {
    const opts = program.optsWithGlobals();
    const version = program.parent?.version();

    intro(`${chalk.green('Actions Runner Registration Wizard')} ${chalk.dim(`v${version}`)}`);

    const result = await group({
      instance: () =>
        opts.instance
          ? Promise.resolve(opts.instance)
          : text({
              message: 'Enter the runner instance URL',
              defaultValue: 'http://localhost:3000',
              placeholder: 'http://localhost:3000',
            }),
      token: () =>
        opts.token
          ? Promise.resolve(opts.token)
          : password({
              message: 'Enter the registration token',
              validate: (v) => (!v ? 'The Token cannot be empty.' : undefined),
            }),
      name: () =>
        opts.name
          ? Promise.resolve(opts.name)
          : text({
              message: 'Please enter the Runner name',
              defaultValue: os.hostname(),
              placeholder: os.hostname(),
            }),
      labels: () =>
        opts.labels
          ? Promise.resolve(opts.labels)
          : groupMultiselect({
              message: 'Select the runner labels',
              options: {
                OS: [
                  { value: 'ubuntu', label: 'Ubuntu' },
                  { value: 'windows', label: 'Windows' },
                ],
                Runtime: [
                  { value: 'node', label: 'Node.js' },
                  { value: 'go', label: 'Go' },
                ],
              },
            }),
    });

    await doRegister(result as RegisterOptions);
  });
