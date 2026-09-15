import { ActionRun } from './run';
import { ActionRunAttempt } from './run_attempt';
import { ActionRunAttemptJobIdIndex } from './run_attempt_job_id_index';
import { ActionRunIndex } from './run_index';
import { ActionRunJob } from './run_job';
import { ActionRunner } from './runner';
import { ActionRunnerToken } from './runner_token';
import { ActionSchedule } from './schedule';
import { ActionScheduleSpec } from './schedule_spec';
import { ActionTask } from './task';
import { ActionTaskOutput } from './task_output';
import { ActionTaskStep } from './task_step';
import { ActionTaskVersion } from './task_version';

export const models = {
  ActionRun,
  ActionRunAttempt,
  ActionRunIndex,
  ActionRunAttemptJobIdIndex,
  ActionRunJob,
  ActionRunner,
  ActionRunnerToken,
  ActionSchedule,
  ActionScheduleSpec,
  ActionTaskStep,
  ActionTask,
  ActionTaskOutput,
  ActionTaskVersion,
};

export type Models = typeof models;

Object.values(models).forEach((model: any) => {
  model.associate?.(models);
});

export * from './run';
export * from './run_attempt';
export * from './run_attempt_job_id_index';
export * from './run_index';
export * from './run_job';
export * from './runner';
export * from './task_version';
export * from './runner_token';
export * from './schedule';
export * from './schedule_spec';
export * from './task_step';
export * from './task';
export * from './task_output';
