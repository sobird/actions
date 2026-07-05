import ActionRun from './run';
import ActionRunJob from './run_job';
import ActionRunner from './runner';
import ActionRunnerToken from './runner_token';
import ActionSchedule from './schedule';
import ActionScheduleSpec from './schedule_spec';
import ActionStep from './step';
import ActionTask from './task';
import ActionTaskVersion from './task_version';

export const models = {
  ActionRunJob,
  ActionRun,
  ActionRunner,
  ActionRunnerToken,
  ActionSchedule,
  ActionScheduleSpec,
  ActionStep,
  ActionTask,
} as const;

Object.values(models).forEach((model: any) => {
  model.associate?.(models);
});

export type Models = typeof models;

export {
  ActionRunJob,
  ActionRun,
  ActionRunner,
  ActionRunnerToken,
  ActionSchedule,
  ActionScheduleSpec,
  ActionStep,
  ActionTask,
};

export default {
  Job: ActionRunJob,
  Run: ActionRun,
  Runner: ActionRunner,
  ActionRunnerToken: ActionRunnerToken,
  Step: ActionStep,
  Task: ActionTask,
  TaskVersion: ActionTaskVersion,
};
