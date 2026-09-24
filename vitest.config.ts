import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    // 并行跑文件的前提是每个 worker 有自己的库，否则并发写会锁成 SQLITE_BUSY；见 test/setup.ts
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // 默认只统计测试碰到的文件，百分比会虚高；显式圈定 src/ 才是整个代码库的比例
      include: ['src/**/*.ts'],
      exclude: [
        // proto 生成的代码，不该按手写的标准衡量
        'src/gen/**',
        // 测试替身和测试本身
        'src/**/__mocks__/**',
        'src/**/*.test.ts',
      ],
    },
  },
});
