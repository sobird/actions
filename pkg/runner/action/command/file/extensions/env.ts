import { type FileCommandExtension } from '.';

const SetEnvFileCommand: FileCommandExtension = {
  contextKey: 'env',

  filePrefix: 'set_env_',

  async process(runner, filename) {
    await runner.container?.readline(filename, (line) => {
      runner.prependPath.push(line);
    });
  },
};

export default SetEnvFileCommand;
