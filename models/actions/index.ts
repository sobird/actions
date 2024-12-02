import ActionsJob from './job';
import ActionsRun from './run';
import ActionsRunner from './runner';
import ActionsRunnerToken from './runner_token';
import ActionsStep from './step';
import ActionsTask from './task';

export const models = {
  ActionsJob,
  ActionsRun,
  ActionsRunner,
  ActionsRunnerToken,
  ActionsStep,
  ActionsTask,
} as const;

Object.values(models).forEach((model: any) => {
  model.associate?.(models);
});

export type Models = typeof models;

export {
  ActionsJob,
  ActionsRun,
  ActionsRunner,
  ActionsRunnerToken,
  ActionsStep,
  ActionsTask,
};

export default {
  Job: ActionsJob,
  Run: ActionsRun,
  Runner: ActionsRunner,
  RunnerToken: ActionsRunnerToken,
  Step: ActionsStep,
  Task: ActionsTask,
};
