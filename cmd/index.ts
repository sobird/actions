#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json' assert { type: 'json' };
import { registerCommand } from './register';
import { generateConfigCommand } from './generate-config';

const program = new Command();

program
  .name('act_runner')
  .description('Run GitHub actions locally by specifying the event name (e.g. `push`) or an action name directly.')
  .version(pkg.version)
  // .arguments('[eventName]')
  .option('-c, --config <path>', 'Config file path');
// .action((eventName: string, options: { config: string }) => {
//   const configFile = options.config;
//   // 这里可以添加事件名处理逻辑
//   console.log(`Event name: ${eventName}, Config file: ${configFile}`);
// });

program.addCommand(registerCommand);
program.addCommand(generateConfigCommand);
program.parse(process.argv);
