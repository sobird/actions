import os from 'node:os';

import log4js from 'log4js';

import Executor from '@/common/executor';
import Runner from '@/runner';
import Config from '@/runner/config';
import Step from '@/runner/context/step';

import Run from './run';
import Stage from './stage';

const logger = log4js.getLogger();

// I have a plan
/** Plan contains a list of stages to run in series */
export default class Plan {
  constructor(public stages: Stage[] = []) {}

  /** determines the max name length of all jobs */
  // maxRunNameLen() {
  //   let maxRunNameLen = 0;
  //   for (const stage of this.stages) {
  //     for (const run of stage.runs) {
  //       const runNameLen = run.name.source?.length || 0;
  //       if (runNameLen > maxRunNameLen) {
  //         maxRunNameLen = runNameLen;
  //       }
  //     }
  //   }
  //   return maxRunNameLen;
  // }

  /** Merge stages with existing stages in plan */
  merge(plan: Plan) {
    const length = Math.max(this.stages.length, plan.stages.length);
    this.stages = Array.from({ length }, (_, i) => {
      const stage = new Stage();

      if (this.stages[i]) stage.concat(this.stages[i]);
      if (plan.stages[i]) stage.concat(plan.stages[i]);

      return stage;
    });
  }

  executor(config: Config, caller?: Runner) {
    const stagePipeline = this.stages.map((stage) => {
      return new Executor(async () => {
        const jobPipeline = stage.runs.map((run) => {
          const { jobId, workflow } = run;

          const jobs = run.job.spread();
          if (jobs.length === 0) {
            const runner = new Runner(run, config);
            runner.caller = caller;
            return runner.executor();
          }

          const maxParallel = run.job.strategy.MaxParallel;

          // matrix jobs 共享 steps context
          const steps: Record<string, Step> = {};
          const runnerPipeline = jobs.map((job) => {
            const newRun = new Run(jobId, workflow);
            // matrix jobs not share job
            newRun.job = job;

            const runner = new Runner(newRun, config);
            runner.caller = caller;
            // matrix jobs share steps context
            runner.context.steps = steps;

            // 跳出 workflow_call 递归调用
            if (caller?.containsCaller(runner)) {
              logger.error(
                'Workflow is not valid: detected cyclic reference',
                caller.run.jobId,
                '<=>',
                runner.run.jobId,
              );
              return new Executor();
            }

            return runner.executor();
          });

          return Executor.Parallel(maxParallel, ...runnerPipeline);
        });

        const ncpu = os.cpus().length;
        logger.debug(`Detected CPUs: ${ncpu}`);
        await Executor.Parallel(ncpu, ...jobPipeline).execute();
      });
    });

    return Executor.Pipeline(...stagePipeline);
    // .then(new Executor(() => {
    //   for (const stage of stages) {
    //     for (const run of stage.runs) {
    //     // todo
    //       const jobResult = run.job.result;
    //       if (jobResult === 'failure') {
    //         return Promise.reject(new Error(`Job '${run.toString()}' failed`));
    //       }
    //     }
    //   }
    // }));
  }
}

export { Stage, Run };
