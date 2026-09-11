import { type FileCommandExtension } from '.';

const SetOutputFileCommand: FileCommandExtension = {
  contextKey: 'output',
  filePrefix: 'set_output_',

  async process(runner, filename) {
    const env = await runner.container!.getFileEnv(filename);
    Object.entries(env).forEach(([key, value]) => {
      const reference = runner.setOutput(key, value);
      runner.debug(`Set output ${reference} = ${value}`);
    });
  },
};

export default SetOutputFileCommand;
