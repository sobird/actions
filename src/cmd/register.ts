import os from 'node:os';

import { intro, text, password, group, multiselect, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import log4js from 'log4js';

import { getConfig, saveRegistration, DEFAULT_LABELS } from '@/config';
import { Labels, Client } from '@/index';

const logger = log4js.getLogger();
logger.level = 'debug';

type Register = ReturnType<typeof registerCommand.opts>;
type RegisterOptions = Required<Register> & {
  config?: string;
  version: string;
};

async function register(options: RegisterOptions) {
  const { instance, token, name, version, ephemeral } = options;
  const labels = new Labels(options.labels).names();

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
      labels,
      version,
      ephemeral,
    });

    if (runner) {
      saveRegistration({
        id: runner.id,
        uuid: runner.uuid,
        name: runner.name,
        token: runner.token,
        address: instance,
        labels: options.labels,
        ephemeral: runner.ephemeral,
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
  .option(
    '--ephemeral',
    'Configure the runner to be ephemeral and only ever be able to pick a single job (stricter than --once)',
    false,
  )
  .action(async (options, program) => {
    const opts = program.optsWithGlobals();
    const version = program.parent?.version();

    intro(`${chalk.green('Actions Runner Registration Wizard')} ${chalk.dim(`v${version}`)}`);

    const inputs = await group(
      {
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
            : multiselect({
                message: 'Select the runner labels',
                initialValues: DEFAULT_LABELS,
                options: new Labels(DEFAULT_LABELS).options(),
              }),
        version: () => Promise.resolve(version),
      },
      {
        onCancel() {
          cancel('Register canceled');
          process.exit(0);
        },
      },
    );

    await register(inputs as RegisterOptions);
  });
