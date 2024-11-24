import fs from 'node:fs';

import DbFile from './file';

type Flags = 'r' | 'rs' | 'sr' | 'r+' | 'rs+' | 'sr+' | 'w' | 'wx' | 'xw' | 'w+' | 'wx+' | 'xw+' | 'a' | 'ax' | 'xa' | 'as' | 'sa' | 'a+' | 'ax+' | 'xa+' | 'as+' | 'sa+';

export async function open(path: string, flags: Flags = 'r') {
  const df = await DbFile.New(path);
  await df.open(flags);

  console.log('df', df);

  return df;
}

export default {
  open,
};
