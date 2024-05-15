class Job {
  constructor(public name: string, public needs: string[] = [], public isScheduled: boolean = false) {}
}

const jobA = new Job('Explore-Gitea-Actions', ['Test-Node']);
const jobB = new Job('Test-Docker', ['Test-Node', 'Explore-Gitea-Actions']);
const jobC = new Job('Test-Node', ['Test-Docker']);
const jobD = new Job('Test-C', ['ddd']);

export function stages(jobs:any) {
  const jobNeeds: Record<string, string[]> = {};

  let jobIdsClone = Object.keys(jobs);

  while (jobIdsClone.length > 0) {
    const newjobIds: string[] = [];
    jobIdsClone.forEach((jobId) => {
      if (!jobNeeds[jobId]) {
        const job = jobs[jobId];
        if (job) {
          jobNeeds[jobId] = job.needs;
          newjobIds.push(...job.needs);
        }
      }
    });
    jobIdsClone = newjobIds;
  }

  const stages: Array<{ job: Job, jobId: string }[]> = [];
  // return true if all strings in jobIds exist in at least one of the stages
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const jobIdsInStages = (jobIds: string[], ...stages: Array<{ job: Job, jobId: string }[]>) => {
    for (const jobId of jobIds) {
      let found = false;
      for (const runs of stages) {
        if (runs.map((run) => { return run.jobId; }).includes(jobId)) {
          found = true;
        }
      }
      if (!found) return false;
    }
    return true;
  };
  while (Object.keys(jobNeeds).length > 0) {
    const runs: { job: Job, jobId: string }[] = [];

    Object.entries(jobNeeds).forEach(([jobId, needs]) => {
      if (jobIdsInStages(needs, ...stages)) {
        runs.push({
          job: jobs[jobId],
          jobId,
        });
        delete jobNeeds[jobId];
      }
    });

    if (runs.length === 0) {
      console.log('unable to build dependency graph for');
      break;
    }
    stages.push(runs);
  }

  return stages;
}

const result = stages([jobA, jobB, jobC, jobD].reduce((acc, job) => {
  acc[job.name] = job;
  return acc;
}, {}));

console.log('result', result);

export function topologicalSort(jobs: any[]) {
  const sortedJobs = [];
  const visit = (job: Job) => {
    if (job.isScheduled) {
      return;
    }
    if (job.needs.length) {
      for (const need of job.needs) {
        const depJob = jobs.find((j) => { return j.name === need; });
        if (depJob) {
          visit(depJob);
        }
      }
    }
    job.isScheduled = true;
    sortedJobs.push(job);
  };
  jobs.forEach((job) => { return visit(job); });
  return sortedJobs;
}

console.log('topologicalSort', topologicalSort([jobA, jobB, jobC, jobD]));
