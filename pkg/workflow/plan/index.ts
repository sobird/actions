import os from 'node:os';

import log4js from 'log4js';

import Executor from '@/pkg/common/executor';

import type Workflow from '..';

const logger = log4js.getLogger();

export type Stages = { jobId: string, workflow: Workflow }[][];

/** Plan contains a list of stages to run in series */
export default class Plan {
  constructor(public stages: Stages = []) {}

  /** determines the max name length of all jobs */
  maxRunNameLen() {
    let maxRunNameLen = 0;
    for (const stage of this.stages) {
      for (const run of stage) {
        const runNameLen = run.toString().length;
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
    const newStages: Stages = new Array(newSize);

    // 合并阶段
    for (let i = 0; i < newSize; i++) {
      // 创建新的 Stage 实例
      let newStage: Stages[0] = [];
      newStages[i] = newStage;

      // 如果原始计划中的阶段索引存在，则添加其运行项
      if (i < this.stages.length) {
        newStage = newStage.concat(this.stages[i]);
      }

      // 如果新阶段列表中的索引存在，则添加其运行项
      if (i < stages.length) {
        newStage = newStage.concat(stages[i]);
      }
    }

    // 更新计划中的阶段列表
    this.stages = newStages;
  }

  executor() {
    const { stages } = this;
    const stagePipeline: Executor[] = [];

    stages.forEach((stage) => {
      stagePipeline.push(new Executor(async () => {
        // const jobPipeline: Executor[] = [];

        const jobPipeline = stage.map((runner) => {
          // job.steps?.forEach(((step) => {
          //   logger.debug('Job.Steps:', step.name);
          // }));

          const jobs = runner.workflow.jobs[runner.jobId].spread();

          console.log('jobs', jobs.length);

          return runner.executor();
        });

        const ncpu = os.cpus().length;
        logger.debug('Detected CPUs:', ncpu);
        await Executor.parallel(ncpu, ...jobPipeline).execute();
      }));
    });

    return Executor.pipeline(...stagePipeline);
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
