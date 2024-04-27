/**
 * reporter.test.ts
 *
 * sobird<i@sobird.me> at 2024/04/26 18:18:27 created.
 */
import log4js from 'log4js';
import Reporter from '.';

describe('Reporter', () => {
  const reporter = new Reporter({} as any);
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

    const logger = log4js.getLogger();

    Object.entries(context).forEach(([key, value]) => {
      logger.addContext(key, value);
    });

    tests.forEach((item) => {
      it(item.message, () => {
        expect(() => { reporter.fire(logger.info(item.message) as any); }).not.toThrow();
      });
    });

    it('ignore command lines', async () => {
      // const client = new Client(); // 假设 Client 类型存在
      // // 配置 mock 行为
      // client.updateLog = jest.fn().mockImplementation((ctx, req) => {
      //   console.log(`Received UpdateLog: ${req.msg.toString()}`);
      //   return Promise.resolve({
      //     msg: {
      //       ackIndex: req.msg.index + req.msg.rows.length,
      //     },
      //   });
      // });
      // client.updateTask = jest.fn().mockImplementation((ctx, req) => {
      //   console.log(`Received UpdateTask: ${req.msg.toString()}`);
      //   return Promise.resolve({});
      // });

      // const ctx = {};
      // const cancel = jest.fn();
      // const taskCtx = new structpb.Struct();
      // const task = {
      //   context: taskCtx,
      // };

      // const reporter = new Reporter(ctx, cancel, client, task);
      // reporter.resetSteps(5);

      // 测试 Fire 方法
      // expect(reporter.fire({
      //   message: 'regular log line',
      //   data: {
      //     stage: 'Main',
      //     stepNumber: 0,
      //     raw_output: true,
      //   },
      // })).toBeNull();

      // // ... 其他 Fire 方法的测试 ...

      // // 关闭报告器
      // await reporter.close('');
    });
  });
});
