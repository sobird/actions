#!/usr/bin/env node

import { Command } from 'commander';

import { daemonCommand } from './daemon';
import { generateConfigCommand } from './generate-config';
import { registerCommand } from './register';
import { runCommand } from './run';
import pkg from '../package.json' with { type: 'json' };

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
program.addCommand(daemonCommand);
program.addCommand(generateConfigCommand);
program.addCommand(runCommand);

program.parse(process.argv);
