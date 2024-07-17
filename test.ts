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

console.log('Directory', Directory);
