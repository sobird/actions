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

export { sequelize };

export * from './actions';
// Importing the dbfs models registers them on the shared sequelize instance, so
// a schema sync creates the tables the log storage writes to.
export * from './dbfs';
