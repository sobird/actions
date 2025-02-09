import fs from 'fs';
import os from 'os';
import path from 'path';

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Artifact stored in a local specified dir
 */
class Storage {
  constructor(
    public dir: string = path.join(os.homedir(), 'artifact'),
  ) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    this.dir = dir;
  }

  exist(id: number) {
    const name = this.filename(id);
    return fs.existsSync(name);
  }

  async write(id: number, offset: number, req: IncomingMessage) {
    const name = this.tmpName(id, offset);

    const tmpDir = this.tmpDir(id);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true, mode: 0o755 });
    }
    req.pipe(fs.createWriteStream(name));
  }

  async commit(id: number, size: number) {
    const tmpDir = this.tmpDir(id);
    const files = fs.readdirSync(tmpDir, { withFileTypes: true }).filter((file) => {
      return file.isFile();
    }).map((file) => {
      return path.join(file.path, file.name);
    }).sort();

    if (files.length === 0) {
      throw Error(`No uploaded parts to commit for id ${id}`);
    }

    const cacheFile = this.filename(id);
    const cacheDir = path.dirname(cacheFile);

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true, mode: 0o755 });
    }

    const target = fs.createWriteStream(cacheFile);
    // const readStream = fs.createReadStream(files[0]);
    // readStream.pipe(target);

    await files.reduce(async (chain, file) => {
      // const result = await chain();
      return chain.then(() => {
        const readStream = fs.createReadStream(file);
        readStream.pipe(target, { end: false }); // end: false 表示不关闭写入流
        // 保存对当前流的引用，以便在流结束时使用
        // currentStream = readStream;

        return new Promise((resolve, reject) => {
          readStream.once('end', () => { return resolve(); });
          readStream.once('error', reject);
        });
      });
    }, Promise.resolve());

    target.end();

    const cacheSize = fs.statSync(cacheFile).size;

    if (size >= 0 && cacheSize !== size) {
      throw new Error(`Uploaded size mismatch: received ${cacheSize} expected ${size}`);
    }

    // Remove temporary files
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return cacheSize;
  }

  serve(res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  }, id: number) {
    const filename = this.filename(id);
    // res.setHeader('Content-Disposition', `attachment; filename=${path.basename(name)}`);
    fs.createReadStream(filename).pipe(res);
  }

  remove(id: number) {
    const filename = this.filename(id);

    if (this.exist(id)) {
      fs.unlinkSync(filename);
    }

    const tmpDir = this.tmpDir(id);

    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir);
    }
  }

  filename(id: number) {
    const no = (id % 0xff).toString(16).toUpperCase().padStart(2, '0');
    return path.join(this.dir, no, `${id}`);
  }

  tmpDir(id: number) {
    return path.join(this.dir, 'tmp', `${id}`);
  }

  tmpName(id: number, offset: number) {
    const hex = offset.toString(16).toUpperCase();
    const paddedHex = Array(16 - hex.length).join('0') + hex;
    return path.join(this.tmpDir(id), paddedHex);
  }
}

export default Storage;
