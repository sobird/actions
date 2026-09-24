/**
 * 每个测试文件用自己的 sqlite 文件（`VITEST_WORKER_ID` 是按文件递增的）。
 *
 * 在此之前所有文件连的是同一个 ./database.sqlite，而 Vitest 默认并行跑文件：两个进程各自
 * 持锁时就有一方会以 `SQLITE_BUSY: database is locked` 失败（vitest.config.ts 里那段
 * `fileParallelism: false` 的注释记的就是这件事）。一个文件一个库既保住了并行，也让每个文件
 * 从空库开始 —— 建表不再依赖 install.ts 之前留下的那个库。
 *
 * 代价是每个文件都要建一次表（15 张表约 165ms，全量 75 个文件约 13s）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { beforeAll } from 'vitest';

const storage = path.join(os.tmpdir(), `actions-unittest-${process.env.VITEST_WORKER_ID ?? 'main'}.sqlite`);

fs.rmSync(storage, { force: true });
process.env.DATABASE_STORAGE = storage;

beforeAll(async () => {
  // 建表必须等到这里：`vi.mock('@/lib/sequelize')` 的测试（模型层大多如此）会把实例改到
  // `:memory:`，而 storage 是建立连接时读的 —— 在测试文件的模块求值之前连上，改写就落空了。
  const { sequelize } = await import('@/models');
  // sync 不 force：已经由 fixture 建过表的库只会补上缺的那几张。
  await sequelize.sync();
});
