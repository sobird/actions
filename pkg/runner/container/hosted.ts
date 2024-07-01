/**
 * Hosted Container
 *
 * sobird<i@sobird.me> at 2024/06/06 21:49:44 created.
 */

/* eslint-disable no-await-in-loop */
import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs, { CopySyncOptions } from 'node:fs';
import path from 'node:path';

import ignore from 'ignore';
import * as tar from 'tar';

interface FileEntry {
  name: string;
  mode: number | string;
  body: string;
}
class Hosted {
  #actPath: string;

  work: string;

  tmpPath: string;

  cwdPath: string;

  tool_cache: string;

  constructor(public base: string, public workspace: string) {
    // like container id
    const work = path.join(base, randomBytes(8).toString('hex'));
    const toolCache = path.join(base, 'tool_cache');

    const actPath = path.join(work, 'act');
    const tmpPath = path.join(work, 'tmp');
    const cwdPath = path.join(work, 'cwd');

    this.work = work;
    this.tool_cache = toolCache;
    this.#actPath = actPath;
    this.tmpPath = tmpPath;
    this.cwdPath = cwdPath;

    [toolCache, actPath, tmpPath, cwdPath].forEach((dir) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }

  async put(destination: string, ...files: FileEntry[]) {
    const dir = path.resolve(this.work, destination);
    for (const file of files) {
      const filename = path.join(dir, file.name);
      fs.mkdirSync(path.dirname(filename), { recursive: true });

      fs.writeFileSync(
        filename,
        Buffer.from(file.body, 'utf-8'),
        {
          mode: file.mode,
        },
      );
    }
  }

  async putDir(destination: string, source: string, useGitIgnore: boolean = false) {
    const dest = path.resolve(this.work, destination);

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
    return fs.cpSync(source, dest, copyOptions);
  }

  putArchive(destination: string, readStream: NodeJS.ReadableStream) {
    const dest = path.resolve(this.work, destination);
    fs.mkdirSync(dest, { recursive: true });

    const pipeline = readStream.pipe(tar.extract({
      cwd: dest,
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

  getArchive(destination: string) {
    const dest = path.resolve(this.work, destination);
    const info = path.parse(dest);
    return tar.create({ cwd: info.dir }, [info.base]);
  }

  async exec(command: string, args: readonly string[], options: SpawnOptionsWithoutStdio = {}) {
    // eslint-disable-next-line no-param-reassign
    options.cwd = path.resolve(this.work, (options.cwd as string) || '');
    // eslint-disable-next-line no-param-reassign
    options.env = {
      ...process.env,
      ...options.env,
    };

    const cp = spawn(command, args, options);

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

  remove() {
    fs.rmSync(this.work, { recursive: true, force: true });
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

  isCaseInsensitive() {
    return process.platform === 'win32';
  }
}

export default Hosted;
