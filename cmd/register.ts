import { Command } from 'commander';
import { prompt } from '@/utils';

console.log('prompt', prompt);

// 定义 RegisterOptions 接口，用于描述注册命令的参数
interface RegisterOptions {
  noInteractive: boolean;
  instanceAddr: string;
  token: string;
  runnerName: string;
  labels: string;
}

const stages = {
  // 与Go代码中的stage对应
  OVERWRITE_LOCAL_CONFIG: 'overwriteLocalConfig',
  INPUT_INSTANCE: 'inputInstance',
  INPUT_TOKEN: 'inputToken',
  INPUT_RUNNER_NAME: 'inputRunnerName',
  INPUT_LABELS: 'inputLabels',
  WAITING_FOR_REGISTRATION: 'waitingForRegistration',
  EXIT: 'exit',
};

const defaultLabels = [
  'ubuntu-latest:docker://gitea/runner-images:ubuntu-latest',
  'ubuntu-22.04:docker://gitea/runner-images:ubuntu-22.04',
  'ubuntu-20.04:docker://gitea/runner-images:ubuntu-20.04',
];

// 假设的注册函数
async function doRegister(inputs: RegisterOptions) {
  // 实际的注册逻辑，这里使用setTimeout模拟异步操作
  await new Promise((resolve) => { setTimeout(resolve, 1000); });
  console.log('Runner registered successfully.');
}

const registerRunner = async (options: RegisterOptions) => {
  try {
    await doRegister(options);
  } catch (error) {
    console.error('Error during registration:', error);
  }
};

// 注册子命令
export const registerCommand = new Command('register')
  .description('Register a runner to the server')
  .option('-no-i, --no-interactive', 'Disable interactive mode', false)
  .option('-i, --instance <addr>', 'Gitea instance address')
  .option('-t, --token <token>', 'Runner token')
  .option('-n, --name <name>', 'Runner name')
  .option('-l, --labels <labels>', 'Runner tags, comma separated')
  .action(registerRunner);
