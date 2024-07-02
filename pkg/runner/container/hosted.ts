/**
 * Hosted Container
 *
 * sobird<i@sobird.me> at 2024/06/06 21:49:44 created.
 */

/* eslint-disable no-await-in-loop */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs, { CopySyncOptions } from 'node:fs';
import path from 'node:path';
import { Writable } from 'node:stream';

import ignore from 'ignore';
import * as tar from 'tar';

import Executor from '@/pkg/common/executor';

import AbstractContainer, { FileEntry, ExecCreateInputs } from './abstract-container';

interface HostedOptions {
  basedir: string;
  workdir?: string;
  stdout?: Writable
}

class Hosted extends AbstractContainer {
  #actPath: string;

  rootdir: string;

  workdir: string;

  tmpPath: string;

  tool_cache: string;

  constructor(public options: HostedOptions) {
    super();

    const { basedir } = options;
    // like container root
    const rootdir = path.join(basedir, randomBytes(8).toString('hex'));
    const toolCache = path.join(basedir, 'tool_cache');

    const actPath = path.join(rootdir, 'act');
    const tmpPath = path.join(rootdir, 'tmp');
    const workdir = path.join(rootdir, options.workdir || '');

    this.rootdir = rootdir;
    this.tool_cache = toolCache;
    this.#actPath = actPath;
    this.tmpPath = tmpPath;
    this.workdir = workdir;

    [toolCache, actPath, tmpPath, workdir].forEach((dir) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }

  put(destination: string, source: string, useGitIgnore: boolean = false) {
    return new Executor(() => {
      let dest = this.resolve(destination);

      const copyOptions: CopySyncOptions = {
        dereference: true,
        recursive: true,
      };

      const ignorefile = path.join(source, '.gitignore');

      if (useGitIgnore && fs.existsSync(ignorefile)) {
        const ig = ignore().add(fs.readFileSync(ignorefile).toString());
        copyOptions.filter = (src) => {
          return !ig.ignores(src);
        };
      }

      const info = path.parse(source);
      const sourceStat = fs.statSync(source);
      if (sourceStat.isFile()) {
        dest = path.join(dest, info.base);
      }

      fs.cpSync(source, dest, copyOptions);
    });
  }

  putContent(destination: string, ...files: FileEntry[]) {
    return new Executor(() => {
      const dest = this.resolve(destination);
      for (const file of files) {
        const filename = path.join(dest, file.name);
        fs.mkdirSync(path.dirname(filename), { recursive: true });

        fs.writeFileSync(
          filename,
          Buffer.from(file.body, 'utf-8'),
          {
            mode: file.mode,
          },
        );
      }
    });
  }

  async putArchive(destination: string, readStream: NodeJS.ReadableStream) {
    const dest = this.resolve(destination);
    fs.mkdirSync(dest, { recursive: true });

    const pipeline = readStream.pipe(tar.extract({
      cwd: dest,
    }));

    await new Promise<void>((resolve, reject) => {
      pipeline.on('error', (err) => {
        reject(err);
      });
      pipeline.on('finish', () => {
        resolve();
      });
    });
  }

  async getArchive(destination: string) {
    const dest = path.resolve(this.rootdir, destination);
    const info = path.parse(dest);
    return tar.create({ cwd: info.dir }, [info.base]) as unknown as NodeJS.ReadableStream;
  }

  exec(command: string[], options: ExecCreateInputs = {}) {
    return new Executor(() => {
      const workdir = this.resolve((options.workdir as string) || '');

      const [cmd, ...args] = command;
      const cp = spawn(cmd, args, {
        cwd: workdir,
        env: {
          // ...process.env,
          ...options.env,
        },
        stdio: 'pipe',
      });

      // cp.stdout.pipe(process.stdout);
      // cp.stderr.pipe(process.stdout);

      cp.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      cp.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      return new Promise((resolve, reject) => {
        cp.on('error', reject);
        cp.on('exit', (code) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Command exited with code ${code}`));
          }
        });
      });
    });
  }

  toContainerPath(rawPath: string) {
    try {
      const relativePath = path.relative(this.rootdir, rawPath);
      if (relativePath !== '') {
        return path.join(this.workdir, relativePath);
      }
    } catch (err) {
      return path.join(this.workdir, path.basename(rawPath));
    }
    return this.workdir;
  }

  get actPath() {
    let actPath = this.#actPath;
    if (process.platform === 'win32') {
      actPath = actPath.replaceAll('\\', '/');
    }
    return actPath;
  }

  remove() {
    fs.rmSync(this.rootdir, { recursive: true, force: true });
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

  resolve(dir: string) {
    const { rootdir, workdir } = this;
    return path.isAbsolute(dir) ? path.join(rootdir, dir) : path.join(workdir, dir);
  }
}

export default Hosted;
