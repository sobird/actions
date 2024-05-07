/**
 * workflow planner
 *
 * sobird<i@sobird.me> at 2024/05/03 18:52:14 created.
 */
// eslint-disable-next-line max-classes-per-file
import fs from 'fs';
import {
  resolve, parse, join, basename,
} from 'node:path';

import Debug from 'debug';

import Workflow from '@/pkg/workflow';

import Job from './job';

const debug = Debug('planner');
debug.enabled = true;

/** Run represents a job from a workflow that needs to be run */
class Run {
  constructor(public jobId: string, public job: Job) {}

  toString() {
    return this.job.name || this.jobId;
  }
}

/** Stage contains a list of runs to execute in parallel */
class Stage {
  constructor(public runs: Run[] = []) {}

  /** will get all the job names in the stage */
  get jobIds() {
    const names: string[] = [];
    for (const run of this.runs) {
      names.push(run.jobId);
    }
    return names;
  }
}

/** Plan contains a list of stages to run in series */
class Plan {
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
  mergeStages(stages: Stage[]) {
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
    if (this.workflows.length === 0) {
      debug('no workflows found by planner');
      return;
    }
    const plan = new Plan();
    this.workflows.forEach((workflow) => {
      const events = workflow.onEvents() as string[];
      if (events.length === 0) {
        debug('no events found for workflow: %s', workflow.file);
        return;
      }
      events.forEach((event) => {
        if (event === eventName) {
          //
          const stages = workflow.stages().map((runs) => {
            return new Stage(runs.map((run) => {
              return new Run(run.jobId, run.job);
            }));
          });

          plan.mergeStages(stages);
        }
      });
    });
    return plan;
  }

  planJob(jobId: string) {
    if (this.workflows.length === 0) {
      debug(`no jobs found for workflow: ${jobId}`);
    }

    const plan = new Plan();

    this.workflows.forEach((workflow) => {
      const stages = workflow.stages(jobId).map((runs) => {
        return new Stage(runs.map((run) => {
          return new Run(run.jobId, run.job);
        }));
      });

      plan.mergeStages(stages);
    });

    return plan;
  }

  planAll() {
    if (this.workflows.length === 0) {
      debug('no workflows found by planner');
    }

    const plan = new Plan();

    this.workflows.forEach((workflow) => {
      const stages = workflow.stages().map((runs) => {
        return new Stage(runs.map((run) => {
          return new Run(run.jobId, run.job);
        }));
      });

      plan.mergeStages(stages);
    });

    return plan;
  }

  /**
   * gets all the events in the workflows file
   */
  events() {
    const eventsSet = new Set();
    this.workflows.forEach((workflow) => {
      // 假设workflow.on()返回一个事件数组
      workflow.onEvents().forEach((event) => {
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
      debug(`Loading workflows from '${absPath}'`);

      fs.readdirSync(absPath, { withFileTypes: true, recursive }).forEach((file) => {
        const { ext } = parse(file.name);
        if (file.isFile() && (ext === '.yml' || ext === '.yaml')) {
          const workflow = Workflow.Read(join(file.path, file.name));
          workflow.file = file.name;
          workflows.push(workflow);
        }
      });
    } else {
      debug(`Loading workflow '${absPath}'`);
      const workflow = Workflow.Read(absPath);
      workflow.file = basename(absPath);
      workflows.push(workflow);
    }

    return new WorkflowPlanner(workflows);
  }

  static Combine(...workflows: Workflow[]) {
    return new WorkflowPlanner(workflows);
  }

  static Single(file: string, name?: string) {
    const workflow = Workflow.Read(file);
    workflow.file = name;

    return new WorkflowPlanner([workflow]);
  }
}

export default WorkflowPlanner;
