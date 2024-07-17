import fs from 'node:fs';
import path from 'node:path';

import Runner from '@/pkg/runner';

import extensions, { FileCommandExtension } from './extensions';

class ActionCommandFile {
  private folderName = '_runner_file_commands';

  private fileSuffix = '';

  private fileCommandDirectory = '';

  private commandExtensions: FileCommandExtension[] = extensions;

  constructor(public runner: Runner) {
    this.fileCommandDirectory = path.join(runner.directory('Temp'), this.folderName);
  }

  async initialize(fileSuffix: string) {
    const { runner } = this;

    for (const fileCommand of this.commandExtensions) {
      const basename = fileCommand.filePrefix + fileSuffix;
      const filename = path.join(this.fileCommandDirectory, basename);

      const executor = runner.container?.putContent(this.fileCommandDirectory, {
        name: basename,
        mode: 0o666,
        body: '',
      });

      // eslint-disable-next-line no-await-in-loop
      await executor?.execute();

      console.log('filename', filename);

      const pathToSet = runner.container ? runner.container.resolve(filename) : filename;
      runner.context.github[fileCommand.contextKey] = pathToSet;
    }
  }

  static TryDeleteFile(file: string) {
    if (!fs.existsSync(file)) {
      return true;
    }
    try {
      fs.rmSync(file);
      return true;
    } catch (err) {
      console.log(`Unable to delete file ${file} for reason: ${(err as Error).message}`);
      return false;
    }
  }
}

export default ActionCommandFile;
