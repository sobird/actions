import Runner from './index';
import Client from '../client';
import { Config } from '@/pkg';
import { version } from '@/package.json';

console.log(import.meta.url, version);

vi.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);

describe('Runner', () => {
  const runner = new Runner(
    RunnerServiceClient,
    (Config.Registration.load('') as any),
    Config.loadDefault(),
  );
});
