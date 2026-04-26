import { type FileCommandExtension } from '.';

const AddPathFileCommand: FileCommandExtension = {
  contextKey: 'path',

  filePrefix: 'add_path_',

  async process(runner, filename) {
    await runner.container?.readline(filename, (line) => {
      runner.addPath(line);
    });
  },
};

export default AddPathFileCommand;
