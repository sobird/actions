import { ActionRun } from './run';
import { ActionRunJob } from './run_job';
import { ActionRunner } from './runner';
import { ActionRunnerToken } from './runner_token';
import { ActionSchedule } from './schedule';
import { ActionScheduleSpec } from './schedule_spec';
import { ActionStep } from './step';
import { ActionTask } from './task';
import { ActionTaskVersion } from './task_version';

export const models = {
  ActionRun,
  ActionRunJob,
  ActionRunner,
  ActionRunnerToken,
  ActionSchedule,
  ActionScheduleSpec,
  ActionStep,
  ActionTask,
  ActionTaskVersion,
};

export type Models = typeof models;

Object.values(models).forEach((model: any) => {
  model.associate?.(models);
});

export * from './run';
export * from './run_job';
export * from './runner';
export * from './task_version';
export * from './runner_token';
export * from './schedule';
export * from './schedule_spec';
export * from './step';
export * from './task';
