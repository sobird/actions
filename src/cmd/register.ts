import os from 'node:os';

import { intro, text, password, group, groupMultiselect } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import log4js from 'log4js';
import prompts, { PromptObject } from 'prompts';

import { Config, Labels, Client } from '@/index';

const logger = log4js.getLogger();

type RegisterArgs = ReturnType<typeof registerCommand.opts>;
type RegisterOptions = Required<RegisterArgs> & {
  config?: string;
  version?: string;
};

async function doRegister(options: RegisterOptions) {
  const { instance, token, name, version } = options;
  const labels = new Labels(options.labels);
  const appconf = await Config.Load(options.config);

  const { PingServiceClient, RunnerServiceClient } = new Client(instance, '', appconf.runner.insecure, '', version);

  const pingResponse = await new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    const ping = async () => {
      try {
        const res = await PingServiceClient.ping({
          data: name,
        });
        logger.info('Successfully pinged the Gitea instance server');

        clearTimeout(timer);
        resolve(res);
      } catch (err) {
        logger.fatal('Cannot ping the Gitea instance server:', (err as Error).message);
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
      appconf.registration.id = runner.id.toString();
      appconf.registration.uuid = runner.uuid;
      appconf.registration.name = runner.name;
      appconf.registration.token = runner.token;
      appconf.registration.address = instance;
      appconf.registration.labels = options.labels;

      appconf.registration.save();
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
    const { instance, token, name, labels } = opts;

    intro(`${chalk.green('Actions Runner Registration Wizard')} ${chalk.dim(`v${version}`)}`);

    const result = await group({
      instance: () =>
        opts.instance
          ? Promise.resolve(opts.instance)
          : text({
              message: '请输入 Gitea 实例地址',
              initialValue: 'http://localhost:3000',
              validate: (v) => (!v ? '地址不能为空' : undefined),
            }),
      token: () =>
        opts.token
          ? Promise.resolve(opts.token)
          : password({
              message: 'Enter the registration Token.',
              mask: '*',
              validate: (v) => (!v ? 'The Token cannot be empty.' : undefined),
            }),
      name: () =>
        opts.name
          ? Promise.resolve(opts.name)
          : text({
              message: 'Please enter the Runner name.',
              initialValue: os.hostname(),
            }),
      labels: () =>
        opts.labels
          ? Promise.resolve(opts.labels)
          : groupMultiselect({
              message: '选择环境标签',
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

    console.log('result', result);

    const questions: PromptObject[] = [];

    if (!instance) {
      questions.push({
        type: 'text',
        name: 'instance',
        message: 'Enter the runner instance URL',
        initial: 'http://localhost:3000',
      });
    }
    if (!token) {
      questions.push({
        type: 'password',
        name: 'token',
        message: 'Enter the runner token',
        validate: (value) => {
          return value !== '';
        },
      });
    }
    if (!name) {
      questions.push({
        type: 'text',
        name: 'name',
        message: 'Enter the runner name',
        initial: os.hostname(),
      });
    }
    if (!labels) {
      questions.push({
        type: 'list',
        name: 'labels',
        message: 'Enter the runner labels',
        initial: 'ubuntu-latest=gitea/runner-images:ubuntu-latest',
        // validate: (value) => {
        //   const values = value.split(',') || [];
        //   const res = values.every((item: string) => {
        //     return Labels.Parse(item);
        //   });
        //   console.log('res', res);
        //   return res;
        // },
      });
    }

    const ddd = await prompts(questions);
    console.log('ddd', ddd);

    await doRegister({ ...opts, ...(await prompts(questions)) } as RegisterOptions);
  });
