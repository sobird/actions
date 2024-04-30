import fs from 'fs';
import path from 'path';

import type { IncomingMessage, ServerResponse } from 'http';

class Storage {
  constructor(public rootDir: string) {
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true, mode: 0o755 });
    }
    this.rootDir = rootDir;
  }

  exist(id: number) {
    const name = this.filename(id);
    return fs.existsSync(name);
  }

  async write(id: number, offset: number, data: IncomingMessage) {
    const name = this.tempName(id, offset);
    const dir = this.tempDir(id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    const file = fs.createWriteStream(name);
    return new Promise((resolve, reject) => {
      data.pipe(file).on('close', resolve).on('error', reject);
    });
  }

  async commit(id: number, size: number) {
    const tempDir = this.tempDir(id);
    const files = fs.readdirSync(tempDir).filter((f) => {
      return !fs.statSync(path.join(tempDir, f)).isDirectory();
    });
    if (files.length === 0) return null;

    const name = this.filename(id);
    const target = fs.createWriteStream(name);
    const promises = files.map((file) => {
      const readStream = fs.createReadStream(path.join(tempDir, file));
      return new Promise((resolve, reject) => {
        readStream.pipe(target, { end: false }).on('end', resolve).on('error', reject);
      });
    });

    await Promise.all(promises);
    target.end();

    if (size >= 0 && fs.statSync(name).size !== size) {
      throw new Error(`broken file: ${fs.statSync(name).size} != ${size}`);
    }

    // Remove temporary files
    files.forEach((file) => {
      fs.unlinkSync(path.join(tempDir, file));
    });
    fs.rmdirSync(tempDir);

    return name;
  }

  serve(res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  }, id: number) {
    const name = this.filename(id);
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(name)}`);
    fs.createReadStream(name).pipe(res);
  }

  remove(id: number) {
    const name = this.filename(id);
    if (this.exist(id)) {
      fs.unlinkSync(name);
    }
    fs.rmdirSync(this.tempDir(id));
  }

  filename(id: number) {
    const no = (id % 0xff).toString(16).toUpperCase().padStart(2, '0');
    return path.join(this.rootDir, no, `${id}`);
  }

  tempDir(id: number) {
    return path.join(this.rootDir, 'tmp', `${id}`);
  }

  tempName(id: number, offset: number) {
    const hex = offset.toString(16).toUpperCase();
    const paddedHex = Array(16 - hex.length).join('0') + hex;
    return path.join(this.tempDir(id), paddedHex);
  }
}

module.exports = Storage;
