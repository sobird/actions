import path from 'node:path';

import Runner from '@/pkg/runner';

import extensions, { FileCommandExtension } from './extensions';

class ActionCommandFile {
  private folderName = '_runner_file_commands';

  private fileSuffix = '';

  private fileCommandDirectory = '';

  private commandExtensions: FileCommandExtension[] = extensions;

  constructor(public runner: Runner) {
    this.fileCommandDirectory = path.join(runner.container!.directory('Temp'), this.folderName);
  }

  public async initialize(fileSuffix: string) {
    const { runner } = this;
    this.fileSuffix = fileSuffix;

    for await (const fileCommand of this.commandExtensions) {
      const basename = fileCommand.filePrefix + fileSuffix;
      const filename = path.join(this.fileCommandDirectory, basename);

      const executor = runner.container!.putContent(this.fileCommandDirectory, {
        name: basename,
        mode: 0o666,
        body: '', // todo test it
      });
      await executor.fn();

      const pathToSet = runner.container ? runner.container.resolve(filename) : filename;
      runner.context.github[fileCommand.contextKey] = pathToSet;
    }
  }

  public async process() {
    for await (const fileCommand of this.commandExtensions) {
      try {
        await fileCommand.process(this.runner, path.join(this.fileCommandDirectory, fileCommand.filePrefix + this.fileSuffix));
      } catch (err) {
        console.error(`Unable to process file command '${fileCommand.contextKey}' successfully.`);
        // context.CommandResult = TaskResult.Failed;
      }
    }
  }
}

export default ActionCommandFile;
