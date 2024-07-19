import fs from 'node:fs';
import util from 'node:util';

import Constants from '@/pkg/common/constants';

import { type FileCommandExtension } from '.';

const AttachmentSizeLimit = 1024 * 1024;

const CreateStepSummaryCommand: FileCommandExtension = {
  contextKey: 'step_summary',

  filePrefix: 'step_summary_',

  async process(runner, filename) {
    // todo
    return;
    const file = await runner.container!.getFile(filename);
    const filesize = file.size;

    if (filesize === 0) {
      console.info(`Step Summary file (${filename}) is empty; skipping attachment upload`);
      return;
    }
    if (filesize > AttachmentSizeLimit) {
      console.error(util.format(Constants.Runner.UnsupportedSummarySize, AttachmentSizeLimit / 1024, filesize / 1024));
      console.info(`Step Summary file (${filename}) is too large (${filesize} bytes); skipping attachment upload`);
      return;
    }

    console.log(`Step Summary file exists: ${filename} and has a file size of ${filesize} bytes`);

    const scrubbedFilePath = `${filename}-scrubbed`;
    let fileContents = '';
    file.on('data', (chunk) => { fileContents += chunk; });
    file.on('end', () => {
      const scrubbedContents = (fileContents);
      // fs.writeFileSync(scrubbedFilePath, scrubbedContents, 'utf8');

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
