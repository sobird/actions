import path from 'path';

export enum Directory {
  Work = 'work',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Actions = 'actions',

  Bin = 'bin',

  Diag = 'diag',

  Externals = 'externals',

  Temp = 'temp',

  Tools = 'tool',

  Update = 'work/update',

}

console.log('Directory', path.relative('/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/hosted-test/85665213a4827853/home/runner', '/test'));
