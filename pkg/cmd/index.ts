#!/usr/bin/env tsx

import { Command } from '@commander-js/extra-typings';

import { configCommand } from './config';
import { daemonCommand } from './daemon';
import pkg from './package.json' with { type: 'json' };
import { registerCommand } from './register';
import { runCommand } from './run';

const program = new Command();

program
  .name('actions')
  .description('Run GitHub actions locally by specifying the event name (e.g. `push`) or an action name directly.')
  .version(pkg.version)
  // .arguments('[eventName]')
  .option('-c, --config <path>', 'config file path', 'actions.config.yaml');
// .action((eventName: string, options: { config: string }) => {
//   const configFile = options.config;
//   // 这里可以添加事件名处理逻辑
//   console.log(`Event name: ${eventName}, Config file: ${configFile}`);
// });

program.addCommand(registerCommand);
program.addCommand(daemonCommand);
program.addCommand(configCommand);
program.addCommand(runCommand);

try {
  program.exitOverride();
  program.parse(process.argv);
} catch (err) {
  // custom processing...
}
