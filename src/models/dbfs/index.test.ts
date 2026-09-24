import fs from 'node:fs';

import dbfs from '@/models/dbfs';

vi.mock('@/lib/sequelize');
vi.mock('@/models/dbfs/meta');
vi.mock('@/models/dbfs/data');

describe('Dbfs Tests', () => {
  it('dbfs open', async () => {
    const fd = await dbfs.open('test.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
    const size = await fd.write(Buffer.from('0123456789'));
    expect(size).toBe(10);

    const buffer = Buffer.alloc(10);

    await fd.seek(0, 'SeekStart');
    await fd.read(buffer);
    expect(buffer.toString()).toBe('0123456789');

    // write some new data
    await fd.seek(1, 'SeekStart');
    await fd.write(Buffer.from('bcdefghi')); // 0bcdefghi9

    await fd.read(buffer);
    // expect(buffer.toString()).toBe('9');

    // 读取全部内容
    await fd.seek(0, 'SeekStart');
    await fd.read(buffer);
    expect(buffer.toString()).toBe('0bcdefghi9');

    // await fd.seek(-1, 'SeekEnd');
    // await fd.write(Buffer.from('JKLMNOP'));
  });

  it('rename test', async () => {
    await dbfs.rename('test.txt', 'test2.txt');

    await expect(dbfs.open('test.txt')).rejects.toThrow();
    await expect(dbfs.open('test2.txt')).resolves.not.toThrow();
  });

  it('remove test', async () => {
    await expect(dbfs.remove('test2.txt')).resolves.not.toThrow();
    await expect(dbfs.open('test2.txt')).rejects.toThrow();
  });

  it('stat test', async () => {
    const f = await dbfs.open('test/test.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);

    let stat = await f.stat();
    expect(stat.size).toBe(0);
    await f.write(Buffer.from('0123456789'));
    stat = await f.stat();
    expect(stat.size).toBe(10);

    await expect(dbfs.remove('test/test.txt')).resolves.not.toThrowError();
  });

  // 上游 dbfile.go 的 open 是「O_EXCL 先判，再 if metaID == 0 { createEmpty }」。
  describe('open flags', () => {
    it('O_CREAT on an existing file opens it and keeps the content', async () => {
      const fd = await dbfs.open('exists.txt', fs.constants.O_WRONLY | fs.constants.O_CREAT);
      await fd.write(Buffer.from('keep-me'));

      const reopened = await dbfs.open('exists.txt', fs.constants.O_WRONLY | fs.constants.O_CREAT);
      expect(await reopened.size()).toBe(7);

      const buffer = Buffer.alloc(7);
      await (await dbfs.open('exists.txt')).read(buffer);
      expect(buffer.toString()).toBe('keep-me');
    });

    it('O_CREAT|O_EXCL on an existing file throws EEXIST', async () => {
      await dbfs.open('exclusive.txt', fs.constants.O_WRONLY | fs.constants.O_CREAT);

      await expect(
        dbfs.open('exclusive.txt', fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL),
      ).rejects.toThrow('EEXIST');
    });

    it('O_CREAT|O_EXCL on a missing file creates it', async () => {
      const fd = await dbfs.open('fresh.txt', fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);

      expect(await fd.size()).toBe(0);
    });
  });
});
