import fs from 'node:fs';
import path from 'node:path';

import Runner from '@/pkg/runner';
import { Step } from '@/pkg/workflow/job/step';

import { FileCommandExtension } from './extensions';

class ActionCommandFile {
  private folderName = '_runner_file_commands';

  private fileSuffix = '';

  private fileCommandDirectory = '';

  private commandExtensions: FileCommandExtension[] = [];

  constructor(public runner: Runner) {
    this.fileCommandDirectory = path.join(runner.directory('Temp'), this.folderName);
  }

  initialize(step: Step) {
    const { runner } = this;
    const fileSuffix = step.uuid;

    for (const fileCommand of this.commandExtensions) {
      const newPath = path.join(this.fileCommandDirectory, fileCommand.filePrefix + fileSuffix);

      runner.container?.putContent(this.fileCommandDirectory, {
        name: fileCommand.filePrefix + fileSuffix,
        mode: 0o666,
      });

      const pathToSet = container != null ? container.TranslateToContainerPath(newPath) : newPath;
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
