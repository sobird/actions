/**
 * Generate an example config file
 *
 * sobird<i@sobird.me> at 2024/04/25 17:21:30 created.
 */
import { Command } from 'commander';

import { ConfigSchema } from '@/config';
import { zodToYaml } from '@/utils/zod.ts';

export const configCommand = new Command('config').description('generate an example config file').action(async () => {
  console.log(zodToYaml(ConfigSchema));
});
