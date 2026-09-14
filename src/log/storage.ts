import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Local object storage for archived logs, keyed by the same path as the DBFS
 * copy. Logs are appended in DBFS while the task runs and moved here once the
 * runner reports no more rows, because object storage cannot be appended to.
 */
const baseDir = path.resolve('./actions_log');

/** Map a storage key to an absolute path, refusing to escape {@link baseDir}. */
function resolveKey(key: string) {
  const fullPath = path.resolve(baseDir, key);
  if (fullPath !== baseDir && !fullPath.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error(`invalid log storage key: ${key}`);
  }
  return fullPath;
}

/** Write an archived log, replacing any previous copy. */
export async function save(key: string, content: Buffer): Promise<number> {
  const fullPath = resolveKey(key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
  return content.length;
}

/** Size of an archived log, or 0 when it does not exist. */
export async function size(key: string): Promise<number> {
  try {
    const stat = await fs.stat(resolveKey(key));
    return stat.size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}

/** Read up to `length` bytes starting at `offset` from an archived log. */
export async function read(key: string, offset: number, length: number): Promise<Buffer> {
  const handle = await fs.open(resolveKey(key), 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, offset);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/** Delete an archived log. Deleting a missing log is a no-op. */
export async function remove(key: string): Promise<void> {
  await fs.rm(resolveKey(key), { force: true });
}

export default { save, size, read, remove };
