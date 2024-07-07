import Runner from '@/pkg/runner';

import ActionCommandManager from './manager';

vi.mock('@/pkg/runner');

// vi.mock('@/pkg/runner', async () => {
//   // const mod = await importOriginal<typeof import('@/pkg/runner')>();
//   // const axios = await vi.importMock('@/pkg/runner');
//   // console.log('axios', axios);
//   return {
//     // ...axios,
//     default: vi.fn().mockImplementation((value: string) => {
//       // 返回一个模拟的 MyClass 实例
//       return {
//         value,
//         complexMethod: vi.fn().mockReturnValue('mocked result'),
//       };
//     }),
//     // 替换一些导出
//     namedExport: vi.fn(),
//   };
// });

console.log('Runner', Runner);

const runner = new (Runner as any)();

console.log('runner', runner);

const commandManager = new ActionCommandManager(runner);

commandManager.process('::set-env name=hello,::worls');
