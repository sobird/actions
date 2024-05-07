import { Replacer } from './replacer';

export function safeFilename(filename: string) {
  return new Replacer([
    ['<', '-'],
    ['>', '-'],
    [':', '-'],
    ['"', '-'],
    ['/', '-'],
    ['\\', '-'],
    ['|', '-'],
    ['?', '-'],
    ['*', '-'],
  ]).replace(filename);
}
