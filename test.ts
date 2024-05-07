/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-syntax */
const workflow = {
  jobs: {
    job1: {
      needs: ['job5'],
    },
    job2: {
      needs: ['job3', 'job4'],
    },
    job3: {
      needs: ['job1'],
    },
  },
};
const jobIds = ['job2', 'job3'];

function createStages(workflow: any, ...jobIds: string[]) {
  const jobDependencies: { [key: string]: string[] } = {};

  let njobIds = [...jobIds];

  while (njobIds.length > 0) {
    const newjobIds: string[] = [];
    njobIds.forEach((jID) => {
      if (!jobDependencies[jID]) {
        const job = workflow.jobs[jID];
        if (job) {
          jobDependencies[jID] = job.needs;
          newjobIds.push(...job.needs);
        }
      }
    });
    njobIds = newjobIds;
  }

  console.log('jobDependencies', jobDependencies);

  const stages = [];
  while (Object.keys(jobDependencies).length > 0) {
    const stage: any = {
      runs: [],
    };
    for (const jID in jobDependencies) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (listInStages(jobDependencies[jID], ...stages)) {
        stage.runs.push({
          workflow,
          jobId: jID,
        });
        delete jobDependencies[jID];
      }
    }
    if (stage.runs.length === 0) {
      console.log('unable to build dependency graph for');
      break;
    }
    stages.push(stage);
  }

  console.log('stages', stages.map((item) => {
    return item.runs;
  }));
}

createStages(workflow, ...jobIds);

function listInStages(srcList: string[], ...stages: any[]): boolean {
  for (const src of srcList) {
    let found = false;
    console.log('src123', src);
    for (const stage of stages) {
      if (stage.runs.map((run) => { console.log('run', run, src); return run.jobId; }).includes(src)) {
        found = true;
      }
    }
    if (!found) return false;
  }
  return true;
}

console.log('listInStages', listInStages([], ...[]));

class Test {
  toString() {
    return '1121';
  }
}

const test = new Test();
console.log('test', test);
