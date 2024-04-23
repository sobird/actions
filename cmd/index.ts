#!/usr/bin/env node

import { Command } from 'commander';
import { registerCommand } from './register';

import pkg from '../package.json' assert { type: 'json' };

const program = new Command();

program
  .name('act_runner')
  .description('Run GitHub actions locally by specifying the event name (e.g. `push`) or an action name directly.')
  .version(pkg.version)
  .arguments('[eventName]')
  .option('-c, --config <path>', 'Config file path');
// .action((eventName: string, options: { config: string }) => {
//   const configFile = options.config;
//   // 这里可以添加事件名处理逻辑
//   console.log(`Event name: ${eventName}, Config file: ${configFile}`);
// });

program.command('test')
  .description('test cmd')
  .option('-n, --name <string>', 'name')
  .option('-k, --key <string>', 'key')
  .option('-s, --secret <string>', 'secret')
  .action(async (options) => {
    console.log('options', options);
  });

program.addCommand(registerCommand);
program.parse(process.argv);
