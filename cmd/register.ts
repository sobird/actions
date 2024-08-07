import os from 'node:os';

import { Command } from '@commander-js/extra-typings';
import log4js from 'log4js';
import prompts, { PromptObject } from 'prompts';

import { Config, Labels, Client } from '@/pkg';

const logger = log4js.getLogger();

type RegisterArgs = ReturnType<typeof registerCommand.opts>;
type RegisterOptions = Required<RegisterArgs> & {
  config?: string;
  version?: string;
};

async function doRegister(options: RegisterOptions) {
  const {
    instance, token, name, version,
  } = options;
  const labels = new Labels(options.labels);
  const config = Config.Load(options.config);
  const { PingServiceClient, RunnerServiceClient } = new Client(instance, '', config.runner.insecure, '', version);

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
        // logger.debug('Successfully pinged the Gitea instance server');
      } catch (err: any) {
        logger.fatal('Cannot ping the Gitea instance server:', err.message);
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
      const registration = new Config.Registration(
        runner.id.toString(),
        runner.uuid,
        runner.name,
        runner.token,
        instance,
        options.labels,
      );
      registration.save(config.runner.file);
      logger.info('Runner registered successfully.');
    }
  } catch (err) {
    logger.fatal('Failed to register runner:', (err as Error).message);
  }
}

const registerAction = async (options: RegisterArgs, program: typeof Command.prototype) => {
  const opts = program.optsWithGlobals<RegisterOptions>();
  opts.version = program.parent?.version();
  const {
    instance, token, name, labels,
  } = opts;

  const questions: PromptObject[] = [];

  if (!instance) {
    questions.push({
      type: 'text',
      name: 'instance',
      message: 'Enter the runner instance URL',
      initial: 'https://gitea.com',
    });
  }
  if (!token) {
    questions.push({
      type: 'password',
      name: 'token',
      message: 'Enter the runner token',
      validate: (value) => { return value !== ''; },
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
      // @todo defaults value
      initial: 'ubuntu-latest:docker://gitea/runner-images:ubuntu-latest',
      validate: (value) => { const values = value.split(',') || []; return values.every((item: string) => { return Labels.Parse(item); }); },
    });
  }
  await doRegister({ ...opts, ...await prompts(questions) } as RegisterOptions);
};

// 注册子命令
export const registerCommand = new Command('register')
  .description('Register a runner to the server')
  .option('-i, --instance <addr>', 'Gitea instance address')
  .option('-t, --token <token>', 'Runner token')
  .option('-n, --name <name>', 'Runner name')
  .option('-l, --labels <labels>', 'Runner tags, comma separated', (value) => { return value.split(','); })
  .action(registerAction);
