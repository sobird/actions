/* eslint-disable no-param-reassign */
/**
 * Hosted Container
 *
 * @deprecated see index.test.ts
 *
 * sobird<i@sobird.me> at 2024/06/06 21:49:44 created.
 */

import { spawn, spawnSync } from 'node:child_process';
// import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import ignore from 'ignore';
import * as tar from 'tar';

import Executor, { Conditional } from '@/pkg/common/executor';
import logger from '@/pkg/common/logger';
import Runner from '@/pkg/runner';
import { trimSuffix, createSha1Hash } from '@/utils';

import Container, { FileEntry, type ContainerExecOptions } from '.';
import OutputManager from '../outputManager';

export interface HostedContainerOptions {
  /**
   * container name
   */
  name?: string;
  basedir: string;
  workdir: string;
  binds?: string[];

  stdout?: OutputManager;
  stderr?: OutputManager;
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
    // hosted container root
    const rootdir = path.join(basedir, createSha1Hash(options.name));

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
    return new Executor(async () => {
      const dest = this.resolve(destination);
      fs.mkdirSync(dest, { recursive: true });

      const info = path.parse(source);
      const sourceStat = fs.statSync(source);
      if (sourceStat.isDirectory()) {
        info.dir = source;
        info.base = '.';
      }

      const options: tar.TarOptionsWithAliasesAsyncNoFile = {
        cwd: info.dir,
        // prefix: dest,
        portable: true,
      };

      const ignorefile = path.join(source, '.gitignore');
      if (useGitIgnore && fs.existsSync(ignorefile)) {
        const ig = ignore({
          ignorecase: false,
        }).add(fs.readFileSync(ignorefile).toString());
        options.filter = (src) => {
          const relPath = path.relative(source, path.join(source, src));
          if (relPath) {
            return !ig.ignores(relPath);
          }
          return true;
        };
      }

      const pack = tar.create(options, [info.base]);
      const unpack = tar.x({ cwd: dest });

      logger.debug(`Upload file from '${source}' to '${dest}'`);
      pack.pipe(unpack);

      await new Promise<void>((resolve, reject) => {
        pack.on('error', (err) => {
          logger.error('Failed to copy dir to container: %s', (err as Error).message);
          reject(err);
        });
        unpack.on('finish', () => {
          resolve();
        });
      });
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

        logger.debug(`Extracting content to '${filename}'`);
      }
    });
  }

  putArchive(destination: string, readStream: NodeJS.ReadableStream) {
    return new Executor(async () => {
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
          logger.debug(`Upload archive to container: ${dest}`);
          resolve();
        });
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

  exec(commands: string[], { env, cwd = '' }: ContainerExecOptions = {}) {
    return new Executor(async () => {
      const { NODE_OPTIONS, ...envs } = process.env;
      const [command, ...args] = commands;

      const child = spawn(command, args, {
        cwd: this.resolve(this.options.workdir, cwd),
        env: {
          ...envs,
          ...env,
        },
        shell: true,
        stdio: 'pipe',
      });

      readline.createInterface({
        input: child.stdout,
      }).on('line', async (line) => {
        this.options.stdout?.onDataReceived(line);
      });

      readline.createInterface({
        input: child.stderr,
      }).on('line', async (line) => {
        this.options.stderr?.onDataReceived(line);
      });

      await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', (code) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Command exited with code ${code}`));
          }
        });
      });
    });
  }

  // hosted default
  public spawnSync(command: string, args: readonly string[], { cwd = '', env }: ContainerExecOptions) {
    const { NODE_OPTIONS, ...envs } = process.env;

    return spawnSync(command, args, {
      cwd: this.resolve(cwd),
      env: {
        ...envs,
        ...env,
      },
      encoding: 'utf8',
    });
  }

  remove() {
    return new Executor(() => {
      fs.rmSync(this.rootdir, { recursive: true, force: true });
      logger.debug(`Removed container: ${this.rootdir}`);
    });
  }

  resolve(...paths: string[]) {
    const { rootdir, workspace } = this;
    const dir = path.join(...paths);
    if (dir.startsWith(this.rootdir)) {
      return dir;
    }
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
      const outputManager = new OutputManager(runner);

      if (config.bindWorkdir) {
        binds.push(`${config.workdir}:${config.workdir}`);
      }

      const name = runner.ContainerName();

      runner.container = new HostedContainer({
        name,
        basedir: runner.ActionCacheDir,
        workdir: config.workdir,
        binds,
        stdout: outputManager,
        stderr: outputManager,
      }, config.workspace);

      const reuseContainer = new Conditional(() => {
        return Boolean(config.reuse);
      });
      runner.cleanContainerExecutor = Executor.Pipeline(
        runner.container.remove().ifNot(reuseContainer),
      );
    });
  }
}

export default HostedContainer;
