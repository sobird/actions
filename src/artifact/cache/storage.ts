import { existsSync, mkdirSync, createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Artifact stored in a local specified dir
 */
export class Storage {
  constructor(public dir: string = path.join(os.homedir(), 'artifact')) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
  }

  exist(id: number) {
    const name = this.getFinalPath(id);
    return existsSync(name);
  }

  async write(id: number, offset: number, stream: Readable) {
    const tmpDir = this.tmpDir(id);
    const chunkPath = this.getChunkPath(id, offset);

    await fs.mkdir(tmpDir, { recursive: true, mode: 0o755 });
    await pipeline(stream, createWriteStream(chunkPath));
  }

  async commit(id: number, size: number) {
    const tmpDir = this.tmpDir(id);

    if (!existsSync(tmpDir)) {
      throw new Error(`No chunks found for ID: ${id}`);
    }

    const entries = await fs.readdir(tmpDir, { withFileTypes: true });
    const chunkFiles = entries
      .filter((file) => {
        return file.isFile();
      })
      .map((file) => {
        return path.join(file.parentPath, file.name);
      })
      .toSorted();

    if (chunkFiles.length === 0) {
      throw new Error(`No chunks found for ID: ${id}`);
    }

    const finalPath = this.getFinalPath(id);
    await fs.mkdir(path.dirname(finalPath), { recursive: true });

    const targetStream = createWriteStream(finalPath);

    try {
      for await (const file of chunkFiles) {
        await pipeline(createReadStream(file), targetStream, { end: false });
      }
    } finally {
      targetStream.end();
    }

    const { size: actualSize } = await fs.stat(finalPath);

    if (size >= 0 && actualSize !== size) {
      await fs.unlink(finalPath);
      throw new Error(`Size mismatch: received ${actualSize} expected ${size}`);
    }

    await fs.rm(tmpDir, { recursive: true, force: true });
    return actualSize;
  }

  getReadStream(id: number) {
    const filePath = this.getFinalPath(id);
    if (!existsSync(filePath)) {
      throw new Error(`File not found for ID: ${id}`);
    }
    return createReadStream(filePath);
  }

  async remove(id: number) {
    await Promise.all([
      fs.rm(this.getFinalPath(id), { force: true }),
      fs.rm(this.tmpDir(id), { recursive: true, force: true }),
    ]);
  }

  getFinalPath(id: number) {
    const partition = (id % 0xff).toString(16).padStart(2, '0').toUpperCase();
    return path.join(this.dir, partition, id.toString());
  }

  tmpDir(id: number) {
    return path.join(this.dir, 'tmp', `${id}`);
  }

  getChunkPath(id: number, offset: number) {
    const chunkName = offset.toString(16).toUpperCase().padStart(16, '0');
    return path.join(this.tmpDir(id), chunkName);
  }
}
