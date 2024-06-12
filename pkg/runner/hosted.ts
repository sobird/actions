/* eslint-disable no-await-in-loop */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs, { CopyOptions, ReadStream } from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import util from 'node:util';

import simpleGit from 'simple-git';
import * as tar from 'tar';

interface FileEntry {
  name: string;
  mode: number | string;
  body: string;
}
class Hosted {
  #actPath: string;

  tmpPath: string;

  cwdPath: string;

  toolCache: string;

  constructor(public base: string, public workspace: string) {
    const randomPath = path.join(base, crypto.randomBytes(8).toString('hex'));
    const toolCache = path.join(base, 'toolcache');

    const actPath = path.join(randomPath, 'act');
    const tmpPath = path.join(randomPath, 'tmp');
    const cwdPath = path.join(randomPath, 'cwd');

    this.toolCache = toolCache;
    this.#actPath = actPath;
    this.tmpPath = tmpPath;
    this.cwdPath = cwdPath;

    [toolCache, actPath, tmpPath, cwdPath].forEach((dir) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }

  copy(...files: FileEntry[]) {
    for (const file of files) {
      const filename = path.join(this.cwdPath, file.name);
      const dir = path.dirname(filename);
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        filename,
        Buffer.from(file.body, 'utf-8'),
        {
          mode: file.mode,
        },
      );
    }
  }

  async copyDir(source: string, useGitIgnore: boolean = false) {
    const copyOptions: CopyOptions = {
      dereference: true,
      recursive: true,
    };
    if (useGitIgnore) {
      try {
        const git = simpleGit(source);
        copyOptions.filter = async (src) => {
          const result = await git.checkIgnore([src]);
          return result.length === 0;
        };
      } catch (err) {
        //
      }
    }
    return fsPromises.cp(source, this.cwdPath, copyOptions);
  }

  async spawn(command: string, args: string[]) {
    const options = {
      cwd: this.cwdPath,
      env: { ...process.env, sobird: '123' },
    };
    return spawn(command, args, options);
  }

  archive(files: string[]) {
    return tar.create({ cwd: this.base }, files);
  }

  remove() {
    fs.rmSync(this.cwdPath, { recursive: true, force: true });
  }

  copyTarStream(readStream: ReadStream) {
    // fs.rmSync(this.cwdPath, { recursive: true, force: true });
    // fs.mkdirSync(this.cwdPath, { recursive: true });

    const pipeline = readStream.pipe(tar.extract({
      cwd: this.cwdPath,
    }));

    return new Promise<void>((resolve, reject) => {
      pipeline.on('error', (err) => {
        reject(err);
      });
      pipeline.on('finish', () => {
        resolve();
      });
    });
  }

  toContainerPath(rawPath: string) {
    try {
      const relativePath = path.relative(this.workspace, rawPath);
      if (relativePath !== '') {
        return path.join(this.cwdPath, relativePath);
      }
    } catch (err) {
      return path.join(this.cwdPath, path.basename(rawPath));
    }
    return this.cwdPath;
  }

  get actPath() {
    let actPath = this.#actPath;
    if (process.platform === 'win32') {
      actPath = actPath.replaceAll('\\', '/');
    }
    return actPath;
  }

  static GetPathVariableName() {
    const { platform } = process;
    if (platform === 'win32') {
      return 'Path';
    }
    return 'PATH';
  }

  static DefaultPathVariable() {
    return process.env[Hosted.GetPathVariableName()];
  }

  static Os() {
    const map: Record<string, string> = {
      aix: 'Aix',
      darwin: 'macOS',
      freebsd: 'Freebsd',
      linux: 'Linux',
      openbsd: 'Openbsd',
      sunos: 'Sunos',
      win32: 'Windows',
    };
    return map[process.platform];
  }

  static Arch() {
    const map: Record<string, string> = {
      arm: 'ARM',
      arm64: 'ARM64',
      ia32: 'X86',
      loong64: 'LOONG64',
      mips: 'MIPS',
      mipsel: 'MIPSEL',
      ppc: 'PPC',
      ppc64: 'PPC64',
      riscv64: 'RISCV64',
      s390: 'S390',
      s390x: 'S390X',
      x64: 'X64',
    };
    return map[process.arch];
  }

  // On windows PATH and Path are the same key
  static Ignorease() {
    return process.platform === 'win32';
  }
}

export default Hosted;
