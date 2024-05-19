import Workflow from '..';
import Job from '../job';

/** Run represents a job from a workflow that needs to be run */
class Run {
  constructor(public jobId: string, public job: Job, public workflow: Workflow) {}

  get jobName() {
    return this.job.name || this.jobId;
  }
}

export default Run;
