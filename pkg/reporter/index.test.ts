/**
 * reporter.test.ts
 *
 * sobird<i@sobird.me> at 2024/04/26 18:18:27 created.
 */
import log4js from 'log4js';
import Client from '../client';
import Reporter from './index';

vi.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);

describe('Reporter', () => {
  const reporter = new Reporter(RunnerServiceClient);
  describe('parseLogRow', () => {
    const tests = [
      {
        name: 'No command',
        debugOutputEnabled: false,
        args: ['Hello, world!'],
        want: ['Hello, world!'],
      },
      {
        name: 'Add-mask',
        debugOutputEnabled: false,
        args: ['foo mysecret bar', '::add-mask::mysecret', 'foo mysecret bar'],
        want: ['foo mysecret bar', null, 'foo *** bar'],
      },
      {
        name: 'Debug enabled',
        debugOutputEnabled: true,
        args: ['::debug::GitHub Actions runtime token access controls'],
        want: ['GitHub Actions runtime token access controls'],
      },
      {
        name: 'Debug not enabled',
        debugOutputEnabled: false,
        args: ['::debug::GitHub Actions runtime token access controls'],
        want: [null],
      },
      {
        name: 'notice',
        debugOutputEnabled: false,
        args: [
          "::notice file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work",
        ],
        want: [
          "::notice file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work",
        ],
      },
      {
        name: 'warning',
        debugOutputEnabled: false,
        args: [
          "::warning file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work",
        ],
        want: [
          "::warning file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work",
        ],
      },
      {
        name: 'error',
        debugOutputEnabled: false,
        args: [
          "::error file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work",
        ],
        want: [
          "::error file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work",
        ],
      },
      {
        name: 'group',
        debugOutputEnabled: false,
        args: ['::group::', '::endgroup::'],
        want: ['::group::', '::endgroup::'],
      },
      {
        name: 'stop-commands',
        debugOutputEnabled: false,
        args: [
          '::add-mask::foo',
          '::stop-commands::myverycoolstoptoken',
          '::add-mask::bar',
          '::debug::Stuff',
          'myverycoolstoptoken',
          '::add-mask::baz',
          '::myverycoolstoptoken::',
          '::add-mask::wibble',
          'foo bar baz wibble',
        ],
        want: [
          null,
          null,
          '::add-mask::bar',
          '::debug::Stuff',
          'myverycoolstoptoken',
          '::add-mask::baz',
          null,
          null,
          '*** bar baz ***',
        ],
      },
      {
        name: 'unknown command',
        debugOutputEnabled: false,
        args: ['::set-mask::foo'],
        want: ['::set-mask::foo'],
      },
      // ... 根据实际测试需求，可以在这里添加更多的测试用例 ...
    ];
    const logger = log4js.getLogger();
    tests.forEach((test) => {
      it(test.name, () => {
        reporter.debugOutputEnabled = test.debugOutputEnabled;

        test.args.forEach((arg, index) => {
          const result = reporter.parseLogRow(logger.info(arg) as any);
          let got = null;
          if (result?.content) {
            got = result?.content;
          }
          expect(got).toStrictEqual(test.want[index]);
        });
      });
    });
  });

  // fire
  describe('fire', () => {
    it('test fire', () => {
      const context = {
        stage: 'Main',
        stepNumber: 0,
        raw_output: true,
      };
      const tests: any[] = [
        {
          message: 'regular log line',
        },
        {
          message: '::debug::debug log line',
        },
        {
          message: 'regular log line',
        },
        {
          message: '::debug::debug log line',
        },
        {
          message: '::debug::debug log line',
        },
        {
          message: 'regular log line',
        },
      ];
      const stepNumber = 2;

      const logger = log4js.getLogger();
      logger.addContext('jobResult', 0);
      logger.addContext('stepResult', 'success');

      Object.entries(context).forEach(([key, value]) => {
        logger.addContext(key, value);
      });

      logger.addContext('stepNumber', stepNumber);

      reporter.resetSteps(5);

      tests.forEach((item) => {
        expect(() => { reporter.fire(logger.info(item.message) as any); }).not.toThrow();
      // 断言模拟方法被调用
      // expect(RunnerServiceClient.updateLog).toHaveBeenCalled();
      // expect(RunnerServiceClient.updateTask).toHaveBeenCalled();
      });

      expect((reporter as any).state.steps[stepNumber].logLength).toBe(BigInt(3));
    });
  });

  describe('setOutputs', () => {
    it('outputs: key > 255', () => {
      const outputs = new Map();
      const key = Array(64).fill('test').join('');
      outputs.set(key, 'value1');
      reporter.setOutputs(outputs);
      expect((reporter as any).outputs.size).toBe(0);
    });

    it('outputs: value > 1024 * 1024', () => {
      const outputs = new Map();
      const value = Array(1024 * 1024 + 1).fill('1').join('');
      outputs.set('key', value);
      reporter.setOutputs(outputs);
      expect((reporter as any).outputs.size).toBe(0);
    });

    it('outputs: normal', () => {
      const outputs = new Map();
      outputs.set('key', 'value');
      outputs.set('key1', 'value2');
      reporter.setOutputs(outputs);
      expect((reporter as any).outputs.size).toBe(2);
    });
  });

  it(('test reportLog'), async () => {
    await expect(reporter.reportLog(true)).rejects.toThrow('not all logs are submitted');
    await expect(reporter.reportLog(false)).resolves.not.toThrow();
    expect(RunnerServiceClient.updateLog).toHaveBeenCalled();
  });

  it(('test reportState'), async () => {
    await expect(reporter.reportState()).resolves.not.toThrow();
    expect(RunnerServiceClient.updateTask).toHaveBeenCalled();
  });

  it(('test runDaemon'), async () => {
    await expect(reporter.runDaemon()).resolves.not.toThrow();
    expect(RunnerServiceClient.updateTask).toHaveBeenCalled();
  });
});
