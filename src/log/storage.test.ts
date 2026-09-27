import fs from 'node:fs/promises';
import path from 'node:path';

import { MaxReadLength, read, remove, save, size } from './storage';

// The storage dir is fixed to `<cwd>/actions_log`, so every case works inside one
// unique subtree and the cleanup only ever touches that subtree.
const suiteDir = `artifact-storage-test-${Math.random().toString(36).slice(2)}`;
const key = (name: string) => `${suiteDir}/${name}`;

afterAll(async () => {
  await fs.rm(path.resolve('./actions_log', suiteDir), { recursive: true, force: true });
});

describe('resolveKey', () => {
  it('refuses a key that leaves the storage dir', async () => {
    const escaping = [
      '../escape.log',
      '/tmp/escape.log',
      'a/../../escape.log',
      // 前缀相同的兄弟目录不算在 baseDir 里面
      `../${suiteDir}-sibling/escape.log`,
    ];

    const messages = await Promise.all(
      escaping.map(async (bad) => {
        return save(bad, Buffer.from('x')).then(
          () => '',
          (error: Error) => error.message,
        );
      }),
    );

    expect(messages).toEqual(escaping.map((bad) => `invalid log storage key: ${bad}`));
  });
});

describe('save', () => {
  it('replaces a previous copy and reports the size written', async () => {
    expect(await save(key('00/1.log'), Buffer.from('hello'))).toBe(5);
    expect(await save(key('00/1.log'), Buffer.from('hi'))).toBe(2);

    expect(await size(key('00/1.log'))).toBe(2);
  });
});

describe('size', () => {
  it('reads 0 for a log that was never stored', async () => {
    expect(await size(key('00/missing.log'))).toBe(0);
  });
});

describe('read', () => {
  it('reads a slice of a stored log', async () => {
    await save(key('00/2.log'), Buffer.from('hello world'));

    expect((await read(key('00/2.log'), 0, 5)).toString()).toBe('hello');
    expect((await read(key('00/2.log'), 6, 5)).toString()).toBe('world');
    expect((await read(key('00/2.log'), 100, 5)).length).toBe(0);
  });

  it('treats an offset that is not a positive integer as the start of the log', async () => {
    await save(key('00/3.log'), Buffer.from('hello world'));

    expect((await read(key('00/3.log'), -5, 5)).toString()).toBe('hello');
    expect((await read(key('00/3.log'), Number.NaN, 5)).toString()).toBe('hello');
    // 小数位置不是位置，落到它所在的字节上
    expect((await read(key('00/3.log'), 1.5, 3)).toString()).toBe('ell');
  });

  it('cuts a read at the cap instead of allocating what was asked', async () => {
    await save(key('00/4.log'), Buffer.alloc(MaxReadLength + 512, 'x'));

    expect((await read(key('00/4.log'), 0, MaxReadLength * 4)).length).toBe(MaxReadLength);
  });

  it('returns nothing for a length that is not a positive integer, without touching the log', async () => {
    const lengths = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];
    const buffers = await Promise.all(lengths.map((length) => read(key('00/missing.log'), 0, length)));

    expect(buffers.map((buffer) => buffer.length)).toEqual(lengths.map(() => 0));
  });

  it('rejects when the log does not exist', async () => {
    await expect(read(key('00/missing.log'), 0, 8)).rejects.toThrow();
  });
});

describe('remove', () => {
  it('drops a stored log, and does nothing for one that is already gone', async () => {
    await save(key('00/5.log'), Buffer.from('x'));

    await remove(key('00/5.log'));
    expect(await size(key('00/5.log'))).toBe(0);

    await expect(remove(key('00/5.log'))).resolves.toBeUndefined();
  });
});
