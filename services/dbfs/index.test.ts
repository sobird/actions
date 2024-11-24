import fs from 'node:fs';

import dbfs from '@/services/dbfs';

describe('Dbfs Test', () => {
  it('dbfs open', async () => {
    const fd = await dbfs.open('test.txt', fs.constants.O_RDWR);
    // const size = await fd.write(Buffer.from('0123456789'));
    // expect(size).toBe(10);

    const buffer = Buffer.alloc(3);
    const rd = await fd.read(buffer);
    console.log('rd----', rd, buffer.toString());
    await fd.read(buffer);
    console.log('rd----', rd, buffer.toString());

    await fd.read(buffer);
    console.log('rd----', rd, buffer.toString());

    // write some new data
    // await fd.seek(1, 'SeekStart');
    // await fd.write(Buffer.from('bcdefghi'));

    // await fd.seek(-1, 'SeekEnd');
    // await fd.write(Buffer.from('JKLMNOP'));
  });

  it.skip('rename test', async () => {
    await dbfs.rename('test.txt', 'test2.txt');

    // O_RDONLY
    expect(dbfs.open('test.txt')).rejects.toThrowError();
    expect(dbfs.open('test2.txt')).resolves.not.toThrowError();
  });

  it.skip('remove test', async () => {
    await expect(dbfs.remove('test2.txt')).resolves.not.toThrowError();
    await expect(dbfs.open('test2.txt')).rejects.toThrowError();
  });

  it.skip('stat test', async () => {
    const f = await dbfs.open('test/test.txt', fs.constants.O_RDWR | fs.constants.O_CREAT);

    let stat = await f.stat();
    expect(stat.size).toBe(0);
    await f.write(Buffer.from('0123456789'));
    stat = await f.stat();
    expect(stat.size).toBe(10);

    await expect(dbfs.remove('test/test.txt')).resolves.not.toThrowError();
  });
});
