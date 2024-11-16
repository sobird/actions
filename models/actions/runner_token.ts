/**
 * Actions Runner Token
 *
 * sobird<i@sobird.me> at 2024/11/16 20:02:24 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes, CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionsRunnerToken model */
export type ActionsRunnerTokenAttributes = InferAttributes<ActionsRunnerToken>;

/** Some attributes are optional in `ActionsRunnerToken.build` and `ActionsRunnerToken.create` calls */
export type ActionsRunnerTokenCreationAttributes = InferCreationAttributes<ActionsRunnerToken>;

class ActionsRunnerToken extends BaseModel<ActionsRunnerTokenAttributes, ActionsRunnerTokenCreationAttributes> {
  declare token: CreationOptional<string>;

  declare ownerId: number;

  declare repositoryId: number;

  declare enabled: boolean;

  // static associate({ User }) {
  //   this.belongsTo(User, { onDelete: 'cascade' });
  // }
}

ActionsRunnerToken.init(
  {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'actions runner token',
    },
    ownerId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.INTEGER,
      comment: 'repository id',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      comment: 'true means it can be used',
    },
  },
  {
    sequelize,
    modelName: 'ActionsRunnerToken',
  },
);

// ActionsRunnerToken.beforeCreate((model) => {

// });

export default ActionsRunnerToken;
