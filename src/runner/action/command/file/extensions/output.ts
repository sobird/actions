import { type FileCommandExtension } from '.';

const SetOutputFileCommand: FileCommandExtension = {
  contextKey: 'output',

  filePrefix: 'set_output_',

  async process(runner, filename) {
    const env = await runner.container!.getFileEnv(filename);
    Object.entries(env).forEach(([key, value]) => {
      runner.setOutput(key, value);
      console.debug(`Set output ${key} = ${value}`);
    });
  },
};

export default SetOutputFileCommand;
