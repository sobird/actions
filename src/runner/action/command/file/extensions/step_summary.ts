import util from 'node:util';

import { Constants } from '@/common/constants';

import { type FileCommandExtension } from '.';

const AttachmentSizeLimit = 1024 * 1024;

const CreateStepSummaryCommand: FileCommandExtension = {
  contextKey: 'step_summary',
  filePrefix: 'step_summary_',

  async process(runner, filename) {
    const file = await runner.container!.getContent(filename);
    if (!file) {
      runner.debug(`Step Summary file (${filename}) does not exist; skipping attachment upload`);
      return;
    }

    const fileSize = file.size ?? Buffer.byteLength(file.body, 'utf8');

    if (fileSize === 0) {
      runner.debug(`Step Summary file (${filename}) is empty; skipping attachment upload`);
      return;
    }

    if (fileSize > AttachmentSizeLimit) {
      runner.error(util.format(Constants.Runner.UnsupportedSummarySize, AttachmentSizeLimit / 1024, fileSize / 1024));
      runner.debug(`Step Summary file (${filename}) is too large (${fileSize} bytes); skipping attachment upload`);
      return;
    }

    runner.debug(`Step Summary file exists: ${filename} and has a file size of ${fileSize} bytes`);

    // const scrubbedContents = runner.maskSecrets(file.body);
    const stepId = runner.root.context.github.action;

    runner.debug(`Queueing file (${filename}) for attachment upload (${stepId})`);
    // 挂到作业级(root)，等 daemon/Reporter 附件上传通道就绪后上报（同 addIssue 的 @todo）
    // runner.root.queueStepSummary(stepId, scrubbedContents);

    if (runner.context.vars['system.github.results_endpoint']) {
      runner.debug(`Queueing results file (${filename}) for attachment upload (${stepId})`);
      // 上传通道就绪后：Root.QueueSummaryFile(stepId, scrubbedFilePath, stepId) 复用同一份脱敏内容
    }
    // let fileContents = '';
    // file.on('data', (chunk) => {
    //   fileContents += chunk;
    // });
    // file.on('end', () => {
    //   const scrubbedContents = fileContents;
    //   // fs.writeFileSync(scrubbedFilePath, scrubbedContents, 'utf8');

    //   const attachmentName = '';
    //   console.log(`Queueing file (${filename}) for attachment upload (${attachmentName})`);
    //   // Assuming context.Root.QueueAttachFile is a method to queue files for upload
    //   // runner.QueueAttachFile('ChecksAttachmentType.StepSummary', attachmentName, scrubbedFilePath);

    //   // Dual upload the same files to Results Service
    //   if (runner.context.vars['system.github.results_endpoint']) {
    //     console.log(`Queueing results file (${filename}) for attachment upload (${attachmentName})`);
    //     // Assuming context.Root.QueueSummaryFile is a method to queue files for results upload
    //     const stepId = '';
    //     // runner.QueueSummaryFile(attachmentName, scrubbedFilePath, stepId);
    //   }
    // });
  },
};

export default CreateStepSummaryCommand;
