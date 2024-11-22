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

import ActionsRunner from './actions/runner';
import ActionsRunnerToken from './actions/runner_token';

// Model alias
export { ActionsRunnerToken as ActionsRunnerTokenModel };
export { ActionsRunner as ActionsRunnerModel };

const models = {
  ActionsRunner,
  ActionsRunnerToken,
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
