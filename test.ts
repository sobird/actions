import { CronJob } from 'cron';
import { minimatch } from 'minimatch';

const name = 'workflow';
const Workflow = await import(`@/pkg/${name}`);

console.log('Workflow', Workflow.default);

const job = new CronJob(
  '30 5 * * 1,3', // cronTime
  (() => {
    console.log('You will see this message every second');
  }), // onTick
  null, // onComplete
  false, // start
  'America/Los_Angeles', // timeZone
);

console.log('job', job.nextDate());

const patterns = ['*.js', '!*.test.js'];
const filePath = 'someFile.js';

// 检查文件路径是否匹配模式
const isMatch = patterns.every((pattern) => { return minimatch(filePath, pattern); });
console.log(isMatch); // 输出：true 或 false

console.log('minimatch.match', minimatch.match([filePath], '*.jds'));
