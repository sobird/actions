import Options from './options';

it('should parse Docker container create options correctly', () => {
  const clistring = '--cpus 1 --memory 512m --volume /host/path:/container/path --publish 8080:80 --env MY_ENV=value --restart always --network bridge';
  const options = new Options(clistring);

  const results = options.parse();

  expect(results).toEqual({
    cpus: 1,
    memory: '512m',
    volume: ['/host/path:/container/path'],
    publish: ['8080:80'],
    env: ['MY_ENV=value'],
    restart: 'always',
    network: 'bridge',
  });
});

it('should return default options when CLI string is empty', () => {
  const clistring = '';
  const options = new Options(clistring);
  // console.log('options', options);

  const results = options.parse();

  expect(results).toEqual({});
});

it('--mount', () => {
  const clistring = `--mount type=bind,source=/host/path1,target=/container/path1 
  --mount type=bind,source=/host/path2,target=/container/path2,readonly
  --mount type=volume,source=myvolume,target=/container/volume
  --mount type=tmpfs,target=/container/tmpfs`;

  const options = new Options(clistring);
  const results = options.parse();

  expect(results).toEqual({
    mount: [
      { Type: 'bind', Source: '/host/path1', Target: '/container/path1' },
      { Type: 'bind', Source: '/host/path2', Target: '/container/path2' },
      { Type: 'volume', Source: 'myvolume', Target: '/container/volume' },
      { Type: 'tmpfs', Target: '/container/tmpfs' },
    ],
  });
});
