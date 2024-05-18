/**
 * workflows planner
 * 主要是针对，本地运行时进行的计划
 * 对于通过服务端获取任务执行的的计划，服务端只会每次任务只会分配一个Job.
 *
 * sobird<i@sobird.me> at 2024/05/03 18:52:14 created.
 */
// eslint-disable-next-line max-classes-per-file
import fs from 'fs';
import {
  resolve, parse, join, basename,
} from 'node:path';

import log4js from 'log4js';

import Workflow from '@/pkg/workflow';

import Job from './job';

const logger = log4js.getLogger();

/** Run represents a job from a workflow that needs to be run */
class Run {
  constructor(public jobId: string, public job: Job, public workflow: Workflow) {}

  get jobName() {
    return this.job.name || this.jobId;
  }
}

/** Stage contains a list of runs to execute in parallel */
class Stage {
  constructor(public runs: Run[] = []) {}

  /** will get all the job names in the stage */
  get jobIds() {
    return this.runs.map((run) => { return run.jobId; });
  }
}

/** Plan contains a list of stages to run in series */
export class Plan {
  constructor(public stages: Stage[] = []) {}

  /** determines the max name length of all jobs */
  maxRunNameLen() {
    let maxRunNameLen = 0;
    for (const stage of this.stages) {
      for (const run of stage.runs) {
        const runNameLen = run.toString().length;
        if (runNameLen > maxRunNameLen) {
          maxRunNameLen = runNameLen;
        }
      }
    }
    return maxRunNameLen;
  }

  /** Merge stages with existing stages in plan */
  merge(stages: Stage[]) {
    // 确定新阶段列表的大小
    const newSize = Math.max(this.stages.length, stages.length);
    const newStages: Stage[] = new Array(newSize);

    // 合并阶段
    for (let i = 0; i < newSize; i++) {
      // 创建新的 Stage 实例
      const newStage = new Stage([]);
      newStages[i] = newStage;

      // 如果原始计划中的阶段索引存在，则添加其运行项
      if (i < this.stages.length) {
        newStage.runs = newStage.runs.concat(this.stages[i].runs);
      }

      // 如果新阶段列表中的索引存在，则添加其运行项
      if (i < stages.length) {
        newStage.runs = newStage.runs.concat(stages[i].runs);
      }
    }

    // 更新计划中的阶段列表
    this.stages = newStages;
  }
}

/** Planner contains methods for creating plans */
class WorkflowPlanner {
  constructor(public workflows: Workflow[]) {}

  /**
   * PlanEvent builds a new list of runs to execute in parallel for an event name
   */
  planEvent(eventName: string) {
    const plan = new Plan();
    if (this.workflows.length === 0) {
      logger.debug('no workflows found by planner');
      return plan;
    }

    this.workflows.forEach((workflow) => {
      const { events } = workflow;
      if (events.length === 0) {
        logger.debug('no events found for workflow: %s', workflow.file);
        return;
      }
      events.forEach((event) => {
        if (event === eventName) {
          //
          const stages = workflow.stages().map((runs) => {
            return new Stage(runs.map((run) => {
              return new Run(run.jobId, run.job, workflow);
            }));
          });

          plan.merge(stages);
        }
      });
    });
    return plan;
  }

  planJob(...jobId: string[]) {
    if (this.workflows.length === 0) {
      logger.debug(`no jobs found for workflow: ${jobId}`);
    }

    const plan = new Plan();

    this.workflows.forEach((workflow) => {
      const stages = workflow.stages(...jobId).map((runs) => {
        return new Stage(runs.map((run) => {
          return new Run(run.jobId, run.job, workflow);
        }));
      });

      plan.merge(stages);
    });

    return plan;
  }

  planAll() {
    if (this.workflows.length === 0) {
      logger.debug('no workflows found by planner');
    }

    const plan = new Plan();

    this.workflows.forEach((workflow) => {
      const stages = workflow.stages().map((runs) => {
        return new Stage(runs.map((run) => {
          return new Run(run.jobId, run.job, workflow);
        }));
      });

      plan.merge(stages);
    });

    return plan;
  }

  /**
   * gets all the events in the workflows file
   */
  get events() {
    const eventsSet = new Set<string>();
    this.workflows.forEach((workflow) => {
      workflow.events.forEach((event) => {
        eventsSet.add(event);
      });
    });

    const events = Array.from(eventsSet);
    events.sort();
    return events;
  }

  /** will load a specific workflow, all workflows from a directory or all workflows from a directory and its subdirectories */
  static Collect(path: string, recursive: boolean = false) {
    const absPath = resolve(path);
    const stat = fs.statSync(absPath);

    const workflows: Workflow[] = [];

    if (stat.isDirectory()) {
      logger.debug(`Loading workflows from '${absPath}'`);

      fs.readdirSync(absPath, { withFileTypes: true, recursive }).forEach((file) => {
        const { ext } = parse(file.name);
        if (file.isFile() && (ext === '.yml' || ext === '.yaml')) {
          const workflow = Workflow.Read(join(file.path, file.name));
          workflow.file = file.name;
          workflows.push(workflow);
        }
      });
    } else {
      logger.debug(`Loading workflow '${absPath}'`);
      const workflow = Workflow.Read(absPath);
      workflow.file = basename(absPath);
      workflows.push(workflow);
    }

    return new WorkflowPlanner(workflows);
  }

  static Combine(...workflows: Workflow[]) {
    return new WorkflowPlanner(workflows);
  }

  static Single(workflowPayload: string, name?: string) {
    const workflow = Workflow.Load(workflowPayload);
    workflow.file = name;
    return new WorkflowPlanner([workflow]);
  }
}

export default WorkflowPlanner;
