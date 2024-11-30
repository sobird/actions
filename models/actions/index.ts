import { sequelize } from '@/lib/sequelize';

import Job from './job';
import Run from './run';
import Runner from './runner';
import RunnerToken from './runner_token';
import Step from './step';
import Task from './task';

const models = {
  Run,
  Job,
  Runner,
  // RunnerToken,
  Task,
  // Step,
};

Object.values(models).forEach((model: any) => {
  // console.log('sequelize.models', sequelize.models);
  model.associate?.(models);
});

export {
  sequelize,
};
export type Models = typeof models;
export default models;
