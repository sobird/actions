/* eslint-disable no-param-reassign */
/**
 * Hosted Container
 *
 * sobird<i@sobird.me> at 2024/06/06 21:49:44 created.
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs, { CopySyncOptions } from 'node:fs';
import path from 'node:path';

import ignore from 'ignore';
import * as tar from 'tar';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import { trimSuffix } from '@/utils';

import Container, { FileEntry, ContainerExecOptions } from '.';

export interface HostedContainerOptions {
  basedir: string;
  workdir: string;
  stdout?: NodeJS.WritableStream;
  binds?: string[];
}

class HostedContainer extends Container {
  rootdir: string;

  OS = Container.OS(process.platform);

  Arch = Container.Arch(process.arch);

  Environment = 'self-hosted';

  emptyExecutor = new Executor();

  constructor(public options: HostedContainerOptions, workspace?: string) {
    super(options, workspace);

    const { basedir } = options;
    // like container root
    const rootdir = path.join(basedir, randomBytes(8).toString('hex'));

    this.rootdir = rootdir;
    fs.mkdirSync(path.join(rootdir, options.workdir || ''), { recursive: true });

    (options.binds || []).forEach((bind) => {
      const [workdir, containerWorkdir] = bind.split(':');
      const containerWorkdirResolved = this.resolve(containerWorkdir);
      fs.mkdirSync(path.dirname(containerWorkdirResolved), { recursive: true });
      fs.rmSync(containerWorkdirResolved, { recursive: true });
      fs.symlinkSync(workdir, containerWorkdirResolved);
    });
  }

  pullImage() {
    return this.emptyExecutor;
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
          file.body,
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

    const extract = tar.extract({
      cwd: dest,
    }) as unknown as NodeJS.WritableStream;

    const pipeline = readStream.pipe(extract);

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
    const dest = this.resolve(destination);
    const info = path.parse(dest);
    if (!fs.existsSync(dest)) {
      return tar.create({ cwd: info.dir }, []) as unknown as NodeJS.ReadableStream;
    }
    return tar.create({ cwd: info.dir }, [info.base]) as unknown as NodeJS.ReadableStream;
  }

  start() {
    return new Executor().finally(this.putHashFileExecutor);
  }

  exec(command: string[], options: ContainerExecOptions = {}) {
    return new Executor(async () => {
      const workdir = this.resolve(this.options.workdir, (options.workdir as string) || '');

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
    return new Executor(() => {
      fs.rmSync(this.rootdir, { recursive: true, force: true });
    });
  }

  resolve(...paths: string[]) {
    const { rootdir, workspace } = this;
    const dir = path.join(...paths);
    return trimSuffix(path.isAbsolute(dir) ? path.join(rootdir, dir) : path.join(rootdir, workspace, dir), path.sep);
  }

  // resolve(...paths: string[]) {
  //   const { rootdir } = this;
  //   const workdir = path.relative(rootdir, this.workdir);
  //   const dir = path.join(...paths);
  //   return trimSuffix(path.isAbsolute(dir) ? dir : path.resolve(path.sep, workdir, dir), path.sep);
  // }

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

  // eslint-disable-next-line class-methods-use-this
  async imageEnv() {
    return {};
  }

  static Setup(runner: Runner) {
    return new Executor(() => {
      const { config } = runner;
      const binds = [];

      if (config.bindWorkdir) {
        binds.push(`${config.workdir}:${config.workdir}`);
      }

      runner.container = new HostedContainer({
        basedir: runner.ActionCacheDir,
        workdir: config.workdir,
        binds,
      }, config.workspace);
      runner.cleanContainerExecutor = runner.container.remove();
    });
  }
}

export default HostedContainer;
