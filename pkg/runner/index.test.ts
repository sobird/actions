import { vi } from '@vi/globals';
import Runner from '.';
import Client from '../client';
import { Config } from '@/pkg';
import pkg from '@/package.json';

console.log('pkg', import.meta.url, pkg.version);

import.meta.vi.mock('../client1');

// vi.unstable_mockModule('../client', () => {
//   return {
//     execSync: vi.fn(),
//   // 等等...
//   };
// });

const { RunnerServiceClient } = new Client('', '', false);

describe('Runner', () => {
  const runner = new Runner(
    RunnerServiceClient,
    (Config.Registration.load('') as any),
    Config.loadDefault(),
  );
});
