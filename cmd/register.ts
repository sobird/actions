import os from 'node:os';
import { Command } from 'commander';
import prompts, { PromptObject } from 'prompts';
import { Config, Labels, Client } from '@/pkg';

// 定义 RegisterOptions 接口，用于描述注册命令的参数
interface RegisterArgs {
  instance: string;
  token: string;
  name: string;
  labels: string[];
}
interface RegisterOptions extends RegisterArgs {
  config?: string;
  version?: string;
}

async function doRegister(options: RegisterOptions) {
  const {
    instance, token, name, version,
  } = options;
  const labels = new Labels(options.labels);
  const config = Config.loadDefault(options.config);
  const { PingServiceClient, RunnerServiceClient } = new Client(
    instance,
    token,
    config.runner.insecure,
    '',
    version,
  );

  const pingResponse = await new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    const ping = async () => {
      try {
        // 尝试 ping Gitea 实例服务器
        const res = await PingServiceClient.ping({
          data: name,
        });
        console.log('Successfully pinged the Gitea instance server');
        clearTimeout(timer);
        resolve(res);
        // logger.debug('Successfully pinged the Gitea instance server');
      } catch (err: any) {
        console.log('Cannot ping the Gitea instance server', err.message);
        timer = setTimeout(ping, 1000);

        // logger.error('Cannot ping the Gitea instance server', err);
      }
    };
    ping();
  });
  console.log('pingResponse', pingResponse);

  try {
    const { runner } = await RunnerServiceClient.register({
      name,
      token,
      labels: labels.names(),
      agentLabels: labels.names(),
      version,
    });
    const registration = new Config.Registration(
      runner!.id.toString(),
      runner!.uuid,
      runner!.name,
      runner!.token,
      instance,
      options.labels,
    );
    console.log('registration', registration);
    registration.save(config.runner.file);
    console.log('Runner registered successfully.');
  } catch (err) {
    console.log('err', err);
  }
}

const registerAction = async (options: Omit<RegisterOptions, 'config'>, program: typeof Command.prototype) => {
  const opts = program.optsWithGlobals() as RegisterOptions;
  opts.version = program.parent?.version();
  const {
    instance, token, name, labels,
  } = opts;

  console.log('opts', opts);

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
      initial: 'ubuntu-latest:docker://gitea/runner-images:ubuntu-latest',
      validate: (value) => { const values = value.split(',') || []; return values.every((item: string) => { return Labels.parse(item); }); },
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
