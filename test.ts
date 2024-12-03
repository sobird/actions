import { CronJob } from 'cron';

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
