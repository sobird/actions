import Runner from '.';
import Client from '../client';
import { Config } from '@/pkg';

jest.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);

describe('Runner', () => {
  const runner = new Runner(
    RunnerServiceClient,
    (Config.Registration.load('') as any),
    Config.loadDefault(),
  );
});
