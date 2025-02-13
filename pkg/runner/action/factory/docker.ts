import path from 'node:path';

import log4js from 'log4js';
import shellQuote, { ParseEntry } from 'shell-quote';
import * as tar from 'tar';

import Executor, { Conditional } from '@/pkg/common/executor';
import docker from '@/pkg/docker';
import Runner from '@/pkg/runner';
import DockerContainer from '@/pkg/runner/container/docker';
import { isExecutable, createSafeName } from '@/utils';

import Action from '..';

const logger = log4js.getLogger();

type EntrypointStage = 'pre-entrypoint' | 'entrypoint' | 'post-entrypoint';

class DockerAction extends Action {
  protected pre() {
    return this.run('pre-entrypoint').if(this.HasPre);
  }

  protected main() {
    return this.run('entrypoint');
  }

  protected post() {
    return this.run('post-entrypoint').if(this.HasPost);
  }

  private run(entrypointStage: EntrypointStage) {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { stepAction } = runner;
      const { uses } = stepAction!;

      let { image } = this.runs;
      // let forcePull = false;
      if (DockerAction.IsDockerfile(image)) {
        let actionPath = path.basename(this.Dir);
        image = `${createSafeName('actions', actionPath)}:latest`;

        try {
          const dockerImage = docker.getImage(image);
          const imageInspect = await dockerImage.inspect();
          const platform = `${imageInspect.Os}/${imageInspect.Architecture}`;

          if ((!runner.config.containerPlatform || runner.config.containerPlatform === platform) && !runner.config.rebuild) {
            logger.debug("Image '%s' for architecture '%s' already exists", image, runner.config.containerPlatform || '');
          } else {
            try {
              await dockerImage.remove({ force: true });
            } catch (err) {
              logger.error((err as Error).message);
            }
            throw new Error('Image need build');
          }
        } catch (error) {
          logger.error((error as Error).message);
          // need build image
          let archive = new tar.Pack() as unknown as NodeJS.ReadableStream;
          try {
            archive = await runner.container!.getArchive(`${this.Dir}`);
          } catch (err) {
            logger.error((err as Error).message);
            if (runner.config.actionCache) {
              await runner.config.actionCache.fetch(uses.repositoryUrl, uses.repository, uses.ref);
              archive = await runner.config.actionCache.archive(uses.repository, uses.ref, uses.path);
              actionPath = uses.path;
            }
          }

          const parser = new tar.Parser({ strip: 1 });
          const pack = new tar.Pack();
          archive.pipe(parser);

          parser.on('entry', (entry: tar.ReadEntry) => {
          // strip action dir
          // eslint-disable-next-line no-param-reassign
            entry.path = path.relative(actionPath, entry.path);
            pack.add(entry);
          });
          parser.on('finish', () => {
            pack.end();
          });

          const stream = await docker.buildImage(pack as unknown as NodeJS.ReadableStream, { t: image });
          await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => { return (err ? reject(err) : resolve(res)); });
          });
        }
      } else {
        image = image.substring('docker://'.length);
        // forcePull = runner.config.pull;
      }

      // todo
      const stepWith = stepAction?.with.evaluate(runner);
      let cmd = shellQuote.parse(stepWith?.args || '');

      if (cmd.length === 0) {
        cmd = this.runs.args.evaluate(runner);
      }

      let entrypointPath = stepWith?.[entrypointStage];
      if (!entrypointPath) {
        entrypointPath = this.runs[entrypointStage];
      }

      entrypointPath = path.resolve(this.Dir, entrypointPath || '');

      if (!isExecutable(entrypointPath)) {
        entrypointPath = '';
      }

      const entrypoint = shellQuote.parse(entrypointPath);

      runner.Assign(stepAction!.environment, this.runs.env);
      const container = DockerAction.Container(runner, image, cmd, entrypoint);
      return Executor.Pipeline(
        container.remove().ifBool(!runner.config.reuse),
        container.start(true),
      ).finally(
        container.remove().ifBool(!runner.config.reuse),
      );
    });
  }

  public get HasPre() {
    return new Conditional((runner) => {
      return !!this.runs['pre-if'].evaluate(runner!) && !!this.runs['pre-entrypoint'];
    });
  }

  public get HasPost() {
    return new Conditional((runner) => {
      return !!this.runs['post-if'].evaluate(runner!) && !!this.runs['post-entrypoint'];
    });
  }

  applyArgs(runner: Runner) {
    const { stepAction } = runner;

    const inputs: Record<string, string> = {};
    // Set Defaults
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const k in this.inputs) {
      inputs[k] = this.inputs[k].default.evaluate(runner);
    }

    if (stepAction?.with) {
      // eslint-disable-next-line no-restricted-syntax, guard-for-in
      for (const k in stepAction.with) {
        inputs[k] = stepAction.with.evaluate(runner)?.[k] || '';
      }
    }

    runner.Assign(stepAction!.environment, inputs, this.runs.env);
  }

  public static IsDockerfile(image: string) {
    if (image.startsWith('docker://')) {
      return false;
    }
    const imageWithoutPath = image.split('/').pop();
    return imageWithoutPath?.startsWith('Dockerfile') || imageWithoutPath?.endsWith('Dockerfile');
  }

  static Container(runner: Runner, image: string, cmd: ParseEntry[], entrypoint: ParseEntry[]) {
    const { environment } = runner.stepAction!;

    const { config } = runner;
    const [binds, mounts] = runner.BindsAndMounts;
    const credentials = runner.Credentials;

    const name = runner.ContainerName(runner.context.github.action);

    let networkMode = `container:${runner.ContainerName()}`;
    if (runner.IsHosted) {
      networkMode = 'default';
    }

    return new DockerContainer({
      name,
      image,
      env: environment,
      cmd,
      entrypoint: entrypoint.length === 0 ? undefined : entrypoint,
      workdir: config.workdir,
      authconfig: {
        ...credentials,
      },
      binds,
      mounts,
      networkMode,
      privileged: config.containerPrivileged,
      usernsMode: config.containerUsernsMode,
      platform: config.containerPlatform,
      capAdd: config.containerCapAdd,
      capDrop: config.containerCapDrop,
    }, config.workspace);
  }
}

export default DockerAction;
