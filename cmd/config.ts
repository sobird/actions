/**
 * Generate an example config file
 *
 * sobird<i@sobird.me> at 2024/04/25 17:21:30 created.
 */
import { Command } from '@commander-js/extra-typings';

import { Config } from '@/pkg';

export const configCommand = new Command('config')
  .description('generate an example config file')
  .action(async () => {
    console.log(JSON.stringify(Config.Default, null, 2));
  });
