import path from 'node:path';

import log4js from 'log4js';
import shellQuote from 'shell-quote';
import * as tar from 'tar';

import Executor from '@/pkg/common/executor';
import docker from '@/pkg/docker';
import Runner from '@/pkg/runner';
import { createSafeName } from '@/utils';

import Action from '..';

const logger = log4js.getLogger();

class DockerAction extends Action {
  protected main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { stepAction } = runner;
      const { uses } = stepAction!;

      let { image } = this.runs;
      if (DockerAction.IsDockerfile(image)) {
        let actionPath = path.basename(this.Dir);
        image = `${createSafeName('actions', actionPath)}:latest`;

        try {
          const dockerImage = docker.getImage(image);
          const imageInspect = await dockerImage.inspect();
          const platform = `${imageInspect.Os}/${imageInspect.Architecture}`;

          if ((!runner.config.containerPlatform || runner.config.containerPlatform === platform) && !runner.config.rebuild) {
            logger.debug("image '%s' for architecture '%s' already exists", image, runner.config.containerPlatform || '');
          } else {
            await dockerImage.remove();
            throw new Error('image need build');
          }
        } catch (error) {
          // need build image
          let archive = new tar.Pack() as unknown as NodeJS.ReadableStream;
          try {
            archive = await runner.container!.getArchive(`${this.Dir}`);
          } catch (err) {
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
      }

      const stepWith = stepAction?.with.evaluate(runner);
      let args = shellQuote.parse(stepWith?.args || '');
      if (!args) {
        args = this.runs.args;
        // todo
      }

      const { entrypoint } = stepWith;

      if (!entrypoint) {
        // todo
      }
    });
  }

  applyArgs(runner: Runner) {
    const rc = runner;
    const stepModel = runner.stepAction;

    const inputs: Record<string, string> = {};
    // Set Defaults
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const k in this.inputs) {
      inputs[k] = this.inputs[k].default.evaluate(runner);
    }

    if (stepModel?.with) {
      // eslint-disable-next-line no-restricted-syntax, guard-for-in
      for (const k in stepModel.with) {
        inputs[k] = stepModel.with.evaluate(runner)?.[k] || '';
      }
    }

    // mergeIntoMap(step, step.getEnv(), inputs);

    // const stepEE = rc.newStepExpressionEvaluator(ctx, step);
    // for (let i = 0; i < cmd.length; i++) {
    //   cmd[i] = await stepEE.interpolate(ctx, cmd[i]);
    // }

    // mergeIntoMap(step, step.getEnv(), this.runs.env);

    // const ee = rc.newStepExpressionEvaluator(ctx, step);
    // for (const k in step.getEnv()) {
    //   (step.getEnv())[k] = await ee.interpolate(ctx, (step.getEnv())[k]);
    // }
  }

  public static IsDockerfile(image: string) {
    if (image.startsWith('docker://')) {
      return false;
    }
    const imageWithoutPath = image.split('/').pop();
    return imageWithoutPath?.startsWith('Dockerfile.') || imageWithoutPath?.endsWith('Dockerfile');
  }
}

export default DockerAction;
