import fs from 'node:fs';

import { type FileCommandExtension } from '.';

const AttachmentSizeLimit = 1024 * 1024;

const CreateStepSummaryCommand: FileCommandExtension = {
  contextKey: 'step_summary',

  filePrefix: 'step_summary_',

  async process(runner, filename) {
    const content = await runner.container?.getContent(filename);
    const fileSize = content?.length || 0;
    if (fileSize === 0) {
      console.info(`Step Summary file (${filename}) is empty; skipping attachment upload`);
    }
    if (fileSize > AttachmentSizeLimit) {
      // context.Error(String.Format(Constants.Runner.UnsupportedSummarySize, AttachmentSizeLimit / 1024, fileSize / 1024));
      console.info(`Step Summary file (${filename}) is too large (${fileSize} bytes); skipping attachment upload`);
      return;
    }

    console.log(`Step Summary file exists: ${filename} and has a file size of ${fileSize} bytes`);

    const scrubbedFilePath = `${filename}-scrubbed`;
    const fileStream = fs.createReadStream(filename, 'utf8');
    let fileContents = '';
    fileStream.on('data', (chunk) => { fileContents += chunk; });
    fileStream.on('end', () => {
      const scrubbedContents = (fileContents);
      console.log('scrubbedContents', scrubbedContents);
      fs.writeFileSync(scrubbedFilePath, scrubbedContents, 'utf8');

      const attachmentName = '';
      console.log(`Queueing file (${filename}) for attachment upload (${attachmentName})`);
      // Assuming context.Root.QueueAttachFile is a method to queue files for upload
      // runner.QueueAttachFile('ChecksAttachmentType.StepSummary', attachmentName, scrubbedFilePath);

      // Dual upload the same files to Results Service
      if (runner.context.vars['system.github.results_endpoint']) {
        console.log(`Queueing results file (${filename}) for attachment upload (${attachmentName})`);
        // Assuming context.Root.QueueSummaryFile is a method to queue files for results upload
        const stepId = '';
        // runner.QueueSummaryFile(attachmentName, scrubbedFilePath, stepId);
      }
    });
  },
};

export default CreateStepSummaryCommand;
