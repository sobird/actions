import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    // 每个进程各自连 ./database.sqlite，并发写会互相锁成 SQLITE_BUSY。串行跑换确定性，
    // 代价是全量从 26s 变成约 100s。
    fileParallelism: false,
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
