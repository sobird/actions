import type Workflow from '..';
import type Job from '../job';

/** represents a job from a workflow that needs to be run */
class Run {
  job: Job;

  constructor(public jobId: string, public workflow: Workflow) {
    this.job = workflow.jobs[this.jobId];
  }

  // get job() {
  //   return this.workflow.jobs[this.jobId];
  // }

  get name() {
    return this.job.name.source || this.jobId;
  }
}

export default Run;
