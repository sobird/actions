import { type FileCommandExtension } from '.';

const SaveStateFileCommand: FileCommandExtension = {
  contextKey: 'state',

  filePrefix: 'save_state_',

  async process(runner, filename) {
    const env = await runner.container!.getFileEnv(filename);
    Object.entries(env).forEach(([key, value]) => {
      runner.saveState(key, value);
    });
  },
};

export default SaveStateFileCommand;
