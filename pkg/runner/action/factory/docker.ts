import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

import Executor from '@/pkg/common/executor';
import docker from '@/pkg/docker';
import { createSafeName } from '@/utils';
import { readEntry } from '@/utils/tar';

import Action from '..';

class DockerAction extends Action {
  protected main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      let { image } = this.runs;
      if (DockerAction.IsDockerfile(image)) {
        const actionName = path.basename(this.Dir);
        image = `${createSafeName('actions', actionName)}:latest`;

        try {
          const dockerImage = docker.getImage(image);
          const imageInspect = await dockerImage.inspect();
          console.log('imageInspect', imageInspect.Os, imageInspect.Architecture);
          return;
        } catch (error) {
          //
        }

        const archive = await runner.container!.getArchive(`${this.Dir}/.`);
        const parser = new tar.Parser({ strip: 1 });
        const pack = new tar.Pack();
        archive.pipe(parser);

        parser.on('entry', (entry: tar.ReadEntry) => {
          // strip action dir
          // eslint-disable-next-line no-param-reassign
          entry.path = path.relative(actionName, entry.path);
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
