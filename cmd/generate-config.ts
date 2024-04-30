/**
 * Generate an example config file
 *
 * sobird<i@sobird.me> at 2024/04/25 17:21:30 created.
 */
import { Command } from 'commander';

import { Config } from '@/pkg';

export const generateConfigCommand = new Command('generate-config')
  .description('Generate an example config file')
  .action(async () => {
    console.log(Config.example());
  });
