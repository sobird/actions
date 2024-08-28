import * as tar from 'tar';

const pack = tar.create({ portable: true, cwd: '/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/repositorys/gitea/runner-images' }, ['']);

const extract = tar.list({});
pack.pipe(extract);

extract.on('entry', (entry) => {
  let content = Buffer.from('');
  entry.on('data', (chunk: Buffer) => {
    content = Buffer.concat([content, chunk]);
  });
  entry.on('end', () => {
    console.log('content', entry.path);
    // next(); // ready for next entry
  });
});

extract.on('finish', () => {
  console.log('finish');
});
