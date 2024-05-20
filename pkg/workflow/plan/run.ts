import type Workflow from '..';

/** represents a job from a workflow that needs to be run */
class Run {
  constructor(public jobId: string, public workflow: Workflow) {}

  get job() {
    return this.workflow.jobs[this.jobId];
  }

  get name() {
    return this.job.name || this.jobId;
  }
}

export default Run;
