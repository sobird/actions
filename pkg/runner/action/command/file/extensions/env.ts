import { type FileCommandExtension } from '.';

const SetEnvFileCommand: FileCommandExtension = {
  contextKey: 'env',

  filePrefix: 'set_env_',

  async process(runner, filename) {
    const env = await runner.container!.getFileEnv(filename);
    Object.entries(env).forEach(([key, value]) => {
      runner.setEnv(key, value);
      console.debug(`Set env ${key} = ${value}`);
    });
  },
};

export default SetEnvFileCommand;
