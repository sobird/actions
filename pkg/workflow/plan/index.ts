import os from 'node:os';

import log4js from 'log4js';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import Config from '@/pkg/runner/config';

import Run from './run';
import Stage from './stage';

const logger = log4js.getLogger();

/** Plan contains a list of stages to run in series */
export default class Plan {
  constructor(public stages: Stage[] = []) {}

  /** determines the max name length of all jobs */
  maxRunNameLen() {
    let maxRunNameLen = 0;
    for (const stage of this.stages) {
      for (const run of stage.runs) {
        const runNameLen = run.name.length;
        if (runNameLen > maxRunNameLen) {
          maxRunNameLen = runNameLen;
        }
      }
    }
    return maxRunNameLen;
  }

  /** Merge stages with existing stages in plan */
  merge(plan: Plan) {
    const { stages } = plan;
    // 确定新阶段列表的大小
    const newSize = Math.max(this.stages.length, stages.length);
    const newStages: Stage[] = new Array(newSize);

    // 合并阶段
    for (let i = 0; i < newSize; i++) {
      // 创建新的 Stage 实例
      const newStage = new Stage();
      newStages[i] = newStage;

      // 如果原始计划中的阶段索引存在，则添加其运行项
      if (i < this.stages.length) {
        newStage.concat(this.stages[i]);
      }

      // 如果新阶段列表中的索引存在，则添加其运行项
      if (i < stages.length) {
        newStage.concat(stages[i]);
      }
    }

    // 更新计划中的阶段列表
    this.stages = newStages;
  }

  executor(config: Config, caller?: Runner) {
    const { stages } = this;
    const stagePipeline: Executor[] = [];

    stages.forEach((stage) => {
      stagePipeline.push(new Executor(async () => {
        const jobPipeline = stage.runs.map((run) => {
          const { jobId, workflow } = run;

          const jobs = run.job.spread();
          const maxParallel = run.job.strategy.getMaxParallel();

          const runnerPipeline = jobs.map((job) => {
            workflow.jobs[jobId] = job;

            const runner = new Runner(new Run(jobId, workflow), config);
            runner.caller = caller;

            /** @todo just todo test */
            runner.container = caller?.container;

            return runner.executor();
          });

          return Executor.Parallel(maxParallel, ...runnerPipeline);
        });

        const ncpu = os.cpus().length;
        logger.debug('Detected CPUs:', ncpu);
        await Executor.Parallel(ncpu, ...jobPipeline).execute();
      }));
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
