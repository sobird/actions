import fs from 'node:fs';

import dbfs, { SeekWhence, type DbFile } from '@/models/dbfs';

vi.mock('@/lib/sequelize');
vi.mock('@/models/dbfs/meta');
vi.mock('@/models/dbfs/data');

// 上游把 defaultFileBlockSize mock 成 4，让每个用例都跨块跑；本地它是 const，
// 只能在开完句柄之后改。同一个文件的每个句柄都要改，否则两边块边界对不上。
const BLOCK_SIZE = 4;

async function openSmall(path: string, flags: number = fs.constants.O_RDONLY) {
  const fd = await dbfs.open(path, flags);
  fd.blockSize = BLOCK_SIZE;
  return fd;
}

/** 从当前偏移读到文件尾，等价上游的 io.ReadAll。 */
async function readAll(fd: DbFile): Promise<string> {
  const chunks: Buffer[] = [];
  let n = 1;
  while (n > 0) {
    const buffer = Buffer.alloc(fd.blockSize);
    // oxlint-disable-next-line no-await-in-loop
    n = await fd.read(buffer);
    chunks.push(buffer.subarray(0, n));
  }

  return Buffer.concat(chunks).toString();
}

/** 从头读整个文件。 */
async function content(fd: DbFile): Promise<string> {
  await fd.seek(0, SeekWhence.Start);
  return readAll(fd);
}

describe('Dbfs Tests', () => {
  it('dbfs open', async () => {
    const fd = await dbfs.open('test.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
    const size = await fd.write(Buffer.from('0123456789'));
    expect(size).toBe(10);

    const buffer = Buffer.alloc(10);

    await fd.seek(0, SeekWhence.Start);
    await fd.read(buffer);
    expect(buffer.toString()).toBe('0123456789');

    // write some new data
    await fd.seek(1, SeekWhence.Start);
    await fd.write(Buffer.from('bcdefghi')); // 0bcdefghi9

    await fd.read(buffer);
    // expect(buffer.toString()).toBe('9');

    // 读取全部内容
    await fd.seek(0, SeekWhence.Start);
    await fd.read(buffer);
    expect(buffer.toString()).toBe('0bcdefghi9');

    // await fd.seek(-1, SeekWhence.End);
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

  describe('block crossing', () => {
    it('reads and writes across block boundaries', async () => {
      const fd = await openSmall('blocks.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);

      expect(await fd.write(Buffer.from('0123456789'))).toBe(10); // 0123 4567 89

      expect(await content(fd)).toBe('0123456789');

      await fd.seek(1, SeekWhence.Start);
      await fd.write(Buffer.from('bcdefghi')); // 0bcd efgh i9

      // 改写落在两个块上，游标停在 9，所以接下来只读到最后一个字节
      expect(await readAll(fd)).toBe('9');

      expect(await content(fd)).toBe('0bcdefghi9');

      await fd.seek(-1, SeekWhence.End);
      await fd.write(Buffer.from('JKLMNOP')); // 0bcd efgh iJKL MNOP

      expect(await content(fd)).toBe('0bcdefghiJKLMNOP');
    });

    it('fills the gap with zeros when writing past EOF', async () => {
      const fd = await openSmall('hole.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
      await fd.write(Buffer.from('0123456789'));

      await fd.seek(5, SeekWhence.Current);
      await fd.write(Buffer.from('xyzu'));

      expect(await content(fd)).toBe('0123456789\x00\x00\x00\x00\x00xyzu');

      // 再写回那块零填充区
      await fd.seek(-6, SeekWhence.Current);
      await fd.write(Buffer.from('ABCD'));

      expect(await content(fd)).toBe('0123456789\x00\x00\x00ABCDzu');
    });
  });

  describe('existing files', () => {
    it('O_APPEND appends to the end', async () => {
      const fd = await openSmall('append.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
      await fd.write(Buffer.from('test'));

      const appended = await openSmall(
        'append.txt',
        fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_APPEND,
      );
      await appended.write(Buffer.from('\nnew'));

      expect(await content(appended)).toBe('test\nnew');
    });

    it('O_TRUNC empties the file', async () => {
      const fd = await openSmall('trunc.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
      await fd.write(Buffer.from('0123456789'));

      const truncated = await openSmall('trunc.txt', fs.constants.O_RDWR | fs.constants.O_TRUNC);

      expect(await truncated.size()).toBe(0);
      expect(await content(truncated)).toBe('');
    });
  });

  describe('missing files', () => {
    it('write-only opens without O_CREAT report ENOENT', async () => {
      await expect(dbfs.open('missing.txt', fs.constants.O_WRONLY)).rejects.toThrow('ENOENT');
      await expect(
        dbfs.open('missing.txt', fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_TRUNC),
      ).rejects.toThrow('ENOENT');
    });

    it('rename and remove report that the file does not exist', async () => {
      await expect(dbfs.rename('gone.txt', 'other.txt')).rejects.toThrow('File does not exist');
      await expect(dbfs.remove('gone.txt')).rejects.toThrow('File does not exist');
    });
  });

  it('seek supports all three whences and rejects a negative offset', async () => {
    const fd = await openSmall('seek.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
    await fd.write(Buffer.from('0123456789'));

    expect(await fd.seek(3, SeekWhence.Start)).toBe(3);
    expect(await fd.seek(2, SeekWhence.Current)).toBe(5);
    expect(await fd.seek(-1, SeekWhence.End)).toBe(9);

    await expect(fd.seek(-1, SeekWhence.Start)).rejects.toThrow('negative seek offset');
  });

  it('a second handle sees what the first one wrote', async () => {
    const writer = await openSmall('two-handles.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);
    const reader = await openSmall('two-handles.txt');

    await writer.write(Buffer.from('line 1\n'));
    expect(await readAll(reader)).toBe('line 1\n');

    await writer.write(Buffer.from('line 2\n'));
    expect(await readAll(reader)).toBe('line 2\n');
  });
});
