/**
 * Hosted Container
 *
 * sobird<i@sobird.me> at 2024/06/06 21:49:44 created.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs, { CopySyncOptions } from 'node:fs';
import path from 'node:path';

import ignore from 'ignore';
import * as tar from 'tar';

import Executor from '@/pkg/common/executor';

import Container, { FileEntry, ContainerExecOptions } from '.';

export interface HostedContainerOptions {
  basedir: string;
  workdir?: string;
  stdout?: NodeJS.WritableStream;
}

const hashFilesDir = 'bin/hashFiles';

class HostedContainer extends Container {
  rootdir: string;

  workdir: string;

  os = Container.Os(process.platform);

  arch = Container.Arch(process.arch);

  constructor(public options: HostedContainerOptions) {
    super();

    const { basedir } = options;
    // like container root
    const rootdir = path.join(basedir, randomBytes(8).toString('hex'));
    const workdir = path.join(rootdir, options.workdir || '');

    this.rootdir = rootdir;
    this.workdir = workdir;

    [workdir].forEach((dir) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  }

  put(destination: string, source: string, useGitIgnore: boolean = false) {
    return new Executor(() => {
      let dest = this.Resolve(destination);

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
      const dest = this.Resolve(destination);
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
    const dest = this.Resolve(destination);
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
    const dest = this.Resolve(destination);
    const info = path.parse(dest);
    return tar.create({ cwd: info.dir }, [info.base]) as unknown as NodeJS.ReadableStream;
  }

  start() {
    return new Executor(() => {

    }).finally(this.put(hashFilesDir, 'pkg/expression/hashFiles/index.cjs'));
  }

  exec(command: string[], options: ContainerExecOptions = {}) {
    return new Executor(async () => {
      const workdir = this.Resolve((options.workdir as string) || '');

      const [cmd, ...args] = command;
      const cp = spawn(cmd, args, {
        shell: true,
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

      await new Promise((resolve, reject) => {
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

  remove() {
    fs.rmSync(this.rootdir, { recursive: true, force: true });
  }

  Resolve(dir: string = '') {
    const { rootdir, workdir } = this;
    return path.isAbsolute(dir) ? path.join(rootdir, dir) : path.join(workdir, dir);
  }

  resolve(dir: string = '') {
    const { rootdir } = this;
    const workdir = path.relative(rootdir, this.workdir);
    return path.isAbsolute(dir) ? dir : path.resolve(path.sep, workdir, dir);
  }

  // relative(rawPath: string) {
  //   try {
  //     const relativePath = path.relative(this.workdir || '', rawPath);
  //     if (relativePath !== '') {
  //       return path.join(this.workdir, relativePath);
  //     }
  //   } catch (err) {
  //     return path.join(this.workdir, path.basename(rawPath));
  //   }
  //   return this.workdir;
  // }

  // spawnSync(command: string, args: string[], options: ContainerExecOptions = {}) {
  //   return spawnSync(command, args, { encoding: 'utf8' });
  // }

  hashFiles(...patterns: string[]) {
    const followSymlink = patterns[0] === '--follow-symbolic-links';
    if (followSymlink) {
      patterns.shift();
    }

    const env = {
      ...process.env,
      patterns: patterns.join('\n'),
    };

    const cwd = this.Resolve();

    const hashFilesScript = path.resolve(cwd, hashFilesDir, 'index.cjs');

    const { stderr } = spawnSync('node', [hashFilesScript], { env, cwd, encoding: 'utf8' });

    const matches = stderr.match(/__OUTPUT__([a-fA-F0-9]*)__OUTPUT__/g);
    if (matches && matches.length > 0) {
      return matches[0].slice(10, -10);
    }

    return '';
  }
}

export default HostedContainer;
