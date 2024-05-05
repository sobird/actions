/**
 * workflow planner
 *
 * sobird<i@sobird.me> at 2024/05/03 18:52:14 created.
 */
// eslint-disable-next-line max-classes-per-file
import fs from 'fs';
import {
  resolve, parse, basename, dirname,
} from 'node:path';

import Debug from 'debug';

const debug = Debug('planner');

/** Run represents a job from a workflow that needs to be run */
class Run {
  constructor(public jobName: string, public job: any) {}

  toString() {
    return this.job.name || this.jobName;
  }
}

/** Stage contains a list of runs to execute in parallel */
class Stage {
  constructor(public runs: Run[] = []) {}

  /** will get all the job names in the stage */
  get jobNames() {
    const names: string[] = [];
    for (const run of this.runs) {
      names.push(run.jobName);
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
  mergeStages(stages: Stage[]): void {
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
class Planner {
  workflows = [];

  /** will load a specific workflow, all workflows from a directory or all workflows from a directory and its subdirectories */
  constructor(path: string, recursive: boolean = false) {
    const absPath = resolve(path);
    const stat = fs.statSync(absPath);

    let files: fs.Dirent[] = [];

    if (stat.isDirectory()) {
      debug(`Loading workflows from '${absPath}'`);

      files = fs.readdirSync(absPath, { withFileTypes: true, recursive }).filter((file) => {
        const { ext } = parse(file.name);
        return file.isFile() && (ext === '.yml' || ext === '.yaml');
      });
    } else {
      debug(`Loading workflow '${absPath}'`);

      files.push({
        ...stat,
        name: basename(absPath),
        path: dirname(absPath),
      });
    }
    //
  }

  async planJob(jobName: string) {
    const plan = new Plan();
    if (this.workflows.length === 0) {
      console.debug(`no jobs found for workflow: ${jobName}`);
    }
    let lastErr: Error | null = null;

    this.workflows.forEach((workflow) => {
      try {
        const stages = await createStages(w, jobName);
        plan.mergeStages(stages);
      } catch (err) {
        console.warn(err);
        lastErr = err;
      }
    });

    return { plan, error: lastErr };
  }
}

export default Planner;

function createStages(w: any, jobIDs: string[]) {
  const jobDependencies: { [key: string]: string[] } = {};
  const newJobIDs: string[] = [];

  // let newJobIDs: string[] = [...jobIDs];
  // while (newJobIDs.length > 0) {
  //   const jobIDs = newJobIDs;
  //   newJobIDs = [];
  //   for (const jID of jobIDs) {
  //     if (!jobDependencies.hasOwnProperty(jID)) {
  //       const job = w.getJob(jID);
  //       if (job) {
  //         jobDependencies[jID] = job.needs();
  //         newJobIDs.push(...job.needs());
  //       }
  //     }
  //   }
  // }

  const stages: Stage[] = [];
  while (Object.keys(jobDependencies).length > 0) {
    const stage = new Stage();
    for (const jID in jobDependencies) {
      if (listInStages(jobDependencies[jID], ...stages)) {
        stage.Runs.push(new Run(w, jID));
        delete jobDependencies[jID];
      }
    }
    if (stage.Runs.length === 0) {
      return [[], new Error(`unable to build dependency graph for ${w.Name} (${w.File})`)];
    }
    stages.push(stage);
  }

  if (stages.length === 0) {
    return [
      [],
      new Error(
        'Could not find any stages to run. View the valid jobs with `act --list`. Use '
        + '`act --help` to find how to filter by Job ID/Workflow/Event Name',
      ),
    ];
  }

  return [stages, null];
}
