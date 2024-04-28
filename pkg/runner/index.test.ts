import { jest } from '@jest/globals';
import Runner from '.';
import Client from '../client';
import { Config } from '@/pkg';
import { version } from '@/package.json';

console.log('pkg', import.meta.url);

jest.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);

describe('Runner', () => {
  const runner = new Runner(
    RunnerServiceClient,
    (Config.Registration.load('') as any),
    Config.loadDefault(),
  );
});
