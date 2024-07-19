import { type FileCommandExtension } from '.';

const SaveStateFileCommand: FileCommandExtension = {
  contextKey: 'state',

  filePrefix: 'save_state_',

  async process(runner, filename) {
    await runner.container?.readline(filename, (line) => {
      runner.prependPath.push(line);
    });
  },
};

export default SaveStateFileCommand;
