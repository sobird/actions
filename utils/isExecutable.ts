import fs from 'node:fs';

// Check if a file is an executable file
export function isExecutable(file: string) {
  try {
    const stats = fs.statSync(file);
    return !stats.isDirectory() && (stats.mode & 0o111) !== 0;
  } catch (err) {
    return false;
  }
}
