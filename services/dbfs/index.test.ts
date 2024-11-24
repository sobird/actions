import dbfs from '@/services/dbfs';

describe('Dbfs Test', () => {
  it('dbfs open', async () => {
    const fd = await dbfs.open('test.txt', 'w+');
    const size = await fd.write(Buffer.from('0123456789'));
    console.log('size', size);
  });
});
