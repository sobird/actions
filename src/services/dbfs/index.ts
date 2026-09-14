import fs from 'node:fs';

import DbFile from './file';

export async function open(path: string, flags: number = fs.constants.O_RDONLY) {
  const df = await DbFile.create(path);
  await df.open(flags);
  return df;
}

export async function rename(oldPath: string, newPath: string) {
  const df = await DbFile.create(oldPath);
  return df.rename(newPath);
}

export async function remove(path: string) {
  const df = await DbFile.create(path);
  return df.delete();
}

export default {
  open,
  rename,
  remove,
};
