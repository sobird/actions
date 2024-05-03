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

class Plan {
  //
}

class Planner {
  workflows = [];

  constructor(path: string, recursive: boolean = false) {
    const absPath = resolve(path);
    const stat = fs.statSync(absPath);

    let files: fs.Dirent[] = [];

    if (stat.isDirectory()) {
      console.debug(`Loading workflows from '${absPath}'`);

      files = fs.readdirSync(absPath, { withFileTypes: true, recursive }).filter((file) => {
        const { ext } = parse(file.name);
        return file.isFile() && (ext === '.yml' || ext === '.yaml');
      });
    } else {
      console.debug(`Loading workflow '${absPath}'`);

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
