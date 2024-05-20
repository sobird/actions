import type Runner from '@/pkg/runner';

/** Stage contains a list of runs to execute in parallel */
class Stage {
  constructor(public runs: Runner[] = []) {}

  /** will get all the job names in the stage */
  get jobIds() {
    return this.runs.map((run) => { return run.jobId; });
  }
}

export default Stage;
