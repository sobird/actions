/**
 * All Models Index
 *
 * import { models } from '@auth/sequelize-adapter';
 *
 * @see https://github.com/sequelize/sequelize/blob/main/types/test/typescriptDocs/ModelInit.ts
 *
 * sobird<i@sobird.me> at 2021/11/16 20:33:20 created.
 */

import { sequelize } from '@/lib/sequelize';

import Run from './actions/run';
import RunJob from './actions/run_job';
import ActionsRunner from './actions/runner';
import ActionsRunnerToken from './actions/runner_token';
import ActionsTask from './actions/task';
import ActionsTaskVersion from './actions/task_version';
import { DbfsData, DbfsMeta } from './dbfs';

// Model alias
export { ActionsRunnerToken as ActionsRunnerTokenModel };
export { ActionsRunner as ActionsRunnerModel };
export { Run as RunModel };
export { RunJob as RunJobModel };
export { ActionsTask as ActionsTaskModel };
export { ActionsTaskVersion as ActionsTaskVersionModel };
export { DbfsData as DbfsDataModel };
export { DbfsMeta as DbfsMetaModel };

const models = {
  ActionsRunnerToken,
  ActionsRunner,
  Run,
  RunJob,
  ActionsTask,
  ActionsTaskVersion,
  DbfsData,
  DbfsMeta,
};

Object.values(models).forEach((model: any) => {
  model.associate?.(sequelize.models);
});

export type Models = typeof models;
export { sequelize };
export default models;

// declare module 'sequelize' {
//   interface Sequelize {
//     readonly models: {
//       [key: string]: ModelCtor<Model>;
//     }
//   }
// }
