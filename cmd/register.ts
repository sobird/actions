import { Command } from 'commander';

// 定义 registerArgs 接口，用于描述注册命令的参数
interface RegisterArgs {
  noInteractive: boolean;
  instanceAddr: string;
  token: string;
  runnerName: string;
  labels: string;
}

// 注册子命令
export const registerCommand = new Command('register')
  .description('Register a runner to the server')
  .option('-no-i, --no-interactive', 'Disable interactive mode')
  .option('-i, --instance <addr>', 'Gitea instance address')
  .option('-t, --token <token>', 'Runner token')
  .option('-n, --name <name>', 'Runner name')
  .option('-l, --labels <labels>', 'Runner tags, comma separated')
  .action((options: RegisterArgs) => {
    // 在这里实现注册逻辑
    console.log('Registering runner with options:', options);
    // 这里应该调用实际的注册函数，例如:
    // actualRegisterFunction(options);
  });
