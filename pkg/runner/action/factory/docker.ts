import path from 'node:path';

import * as tar from 'tar';

import Executor from '@/pkg/common/executor';
import docker from '@/pkg/docker';
import { createSafeName } from '@/utils';

import Action from '..';

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
            return;
          }

          await dockerImage.remove();
        } catch (error) {
          //
        }

        let archive = new tar.Pack() as unknown as NodeJS.ReadableStream;
        try {
          archive = await runner.container!.getArchive(`${this.Dir}`);
        } catch (error) {
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
      } else {
        image = image.substring('docker://'.length);
      }
    });
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
