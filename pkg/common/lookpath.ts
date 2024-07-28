import fs from 'node:fs';
import path from 'node:path';

// ErrNotFound is the error resulting if a path search failed to find an executable file.
const ErrNotFound = new Error('executable file not found in $PATH');

// Check if a file is an executable file
function isExecutable(file: string) {
  try {
    const stats = fs.statSync(file);
    return !stats.isDirectory() && (stats.mode & 0o111) !== 0;
  } catch (err) {
    return false;
  }
}

// LookPath searches for an executable named file in the
// directories named by the PATH environment variable.
// If file contains a slash, it is tried directly and the PATH is not consulted.
// The result may be an absolute path or a path relative to the current directory.
function lookPath(file: string, env: Record<string, string>) {
  if (file.includes('/')) {
    if (isExecutable(file)) {
      return file;
    }
    return '';
  }

  const pathEnv = process.env.PATH;
  const paths = path.split(pathEnv).map((dir) => { return dir.trim(); });
  for (const dir of paths) {
    if (dir === '') {
      // Unix shell semantics: path element "" means "."
      dir = '.';
    }
    const fullPath = path.join(dir, file);
    if (isExecutable(fullPath)) {
      return fullPath;
    }
  }

  return { found: false, error: new Error(ErrNotFound.message) };
}
