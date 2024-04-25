/**
 * Run as a runner daemon
 *
 * sobird<i@sobird.me> at 2024/04/25 17:44:32 created.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import Docker from 'dockerode';
import log4js from 'log4js';
import { Config, Labels, Client } from '@/pkg';

const logger = log4js.getLogger();

interface DaemonOptions {
  config: string
  version?: string;
}

// 定义原始的 socket 文件路径数组
const commonSocketPaths = [
  '/var/run/docker.sock',
  '/run/podman/podman.sock',
  path.join(os.homedir(), '.colima', 'docker.sock'),
  process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'docker.sock') : '',
  process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'podman', 'podman.sock') : '',
  '\\\\.\\pipe\\docker_engine',
  path.join(os.homedir(), '.docker', 'run', 'docker.sock'),
];

// 获取 Docker socket 路径
function getDockerSocketPath(configDockerHost?: string) {
  // a `-` means don't mount the docker socket to job containers
  if (configDockerHost && configDockerHost !== '-') {
    return configDockerHost;
  }

  // 检查环境变量 DOCKER_HOST
  if (process.env.DOCKER_HOST) {
    return process.env.DOCKER_HOST;
  }

  for (let i = 0; i < commonSocketPaths.length; i++) {
    const socketPath = commonSocketPaths[i];
    if (fs.existsSync(socketPath)) {
      const protocol = /^\\\\.\\pipe\\docker_engine/.test(socketPath) ? 'npipe://' : 'unix://';
      return protocol + socketPath;
    }
  }
}

async function runDaemon(options: any, program: typeof Command.prototype) {
  const opts = program.optsWithGlobals() as DaemonOptions;
  opts.version = program.parent?.version();
  const config = Config.loadDefault(opts.config);
  logger.level = config.log.level;

  logger.info('Starting runner daemon');

  let registration = null;

  try {
    registration = Config.Registration.load(config.runner.file);
    if (!registration) {
      logger.error('registration file not found, please register the runner first');
      return;
    }
  } catch (err: any) {
    logger.fatal('failed to load registration file: %w', err.message);
    return;
  }

  // 优先配置中的labels
  const labels = new Labels(config.runner.labels.length > 0 ? config.runner.labels : registration.labels);

  if (labels.names().length === 0) {
    logger.warn('no labels configured, runner may not be able to pick up jobs');
  }

  if (labels.requireDocker()) {
    const dockerSocketPath = getDockerSocketPath(config.container.docker_host);
    if (!dockerSocketPath) {
      return;
    }

    const docker = new Docker({ socketPath: '/var/run/docker.sock' });

    try {
      await docker.ping();
    } catch (err: any) {
      logger.fatal('cannot ping the docker daemon, is it running? %w', err.message);
      return;
    }

    // if dockerSocketPath passes the check, override DOCKER_HOST with dockerSocketPath
    process.env.DOCKER_HOST = dockerSocketPath;

    // empty cfg.Container.DockerHost means act_runner need to find an available docker host automatically
    // and assign the path to cfg.Container.DockerHost
    if (config.container.docker_host === '') {
      config.container.docker_host = dockerSocketPath;
    }

    // 检查协议，如果协议不是 npipe 或 unix
    // 将 config.container.docker_host 设置为 "-"，因为它不能被挂载到作业容器中
    if (config.container.docker_host) {
      const dockerHost = config.container.docker_host;
      const protoIndex = dockerHost.indexOf('://');

      if (protoIndex !== -1) {
        const scheme = dockerHost.substring(0, protoIndex);

        // toLowerCase 用于忽略大小写比较
        if (scheme.toLowerCase() !== 'npipe' && scheme.toLowerCase() !== 'unix') {
          config.container.docker_host = '-';
        }
      }
    }

    //
    const ddd = 12;
  }

  if (JSON.stringify(registration.labels.sort()) !== JSON.stringify(labels.toStrings().sort())) {
    try {
      registration.save(config.runner.file);
    } catch (err: any) {
      return logger.error('failed to save runner config:', err.message);
    }
    logger.info('labels updated to:', registration.labels);
  }

  const { PingServiceClient, RunnerServiceClient } = new Client(
    registration.address,
    registration.toke,
    config.runner.insecure,
    registration.uuid,
    opts.version,
  );

  console.log('RunnerServiceClient', RunnerServiceClient);

  const tail = 'tail';
}

export const daemonCommand = new Command('daemon')
  .description('Run as a runner daemon')
  .action(runDaemon);
