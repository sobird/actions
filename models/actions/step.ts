/**
 * Actions Secret Model
 *
 * sobird<i@sobird.me> at 2024/11/28 10:14:19 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import { type Models } from '.';

/** These are all the attributes in the ActionsStep model */
export type ActionsStepAttributes = InferAttributes<ActionsStep>;

/** Some attributes are optional in `ActionsStep.build` and `ActionsStep.create` calls */
export type ActionsStepCreationAttributes = InferCreationAttributes<ActionsStep>;

class ActionsStep extends BaseModel<ActionsStepAttributes, ActionsStepCreationAttributes> {
  declare name: string;

  declare taskId: number;

  declare index: number;

  declare repositoryId: number;

  declare logIndex: number;

  declare logLength: number;

  declare status: string;

  declare started: Date;

  declare stopped: Date;

  static associate({ Task }: Models) {
    this.belongsTo(Task, { foreignKey: 'taskId' });
  }
}

ActionsStep.init(
  {
    name: {
      type: DataTypes.STRING,
      comment: 'step name',
    },
    taskId: {
      type: DataTypes.INTEGER,
      comment: 'task id',
    },
    index: {
      type: DataTypes.INTEGER,
      unique: true,
      comment: 'task index',
    },
    repositoryId: {
      type: DataTypes.INTEGER,
      comment: 'repository id',
    },
    logIndex: {
      type: DataTypes.INTEGER,
      comment: 'actions secret value',
    },
    logLength: {
      type: DataTypes.INTEGER,
      comment: 'actions secret value',
    },
    status: {
      type: DataTypes.STRING(64),
    },
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'ActionsStep',
  },
);

export default ActionsStep;
