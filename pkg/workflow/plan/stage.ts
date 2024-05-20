import type Run from './run';

/** Stage contains a list of runs to execute in parallel */
class Stage {
  constructor(public runs: Run[] = []) {}

  /** will get all the job names in the stage */
  get jobIds() {
    return this.runs.map((run) => { return run.jobId; });
  }

  concat(stage: Stage) {
    this.runs = this.runs.concat(stage.runs);
  }
}

export default Stage;
