/**
 * Actions Secret Model
 *
 * sobird<i@sobird.me> at 2024/11/28 10:14:19 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionTask } from '.';

/** These are all the attributes in the ActionStep model */
export type ActionStepAttributes = InferAttributes<ActionStep>;

/** Some attributes are optional in `ActionStep.build` and `ActionStep.create` calls */
export type ActionStepCreationAttributes = InferCreationAttributes<ActionStep>;

export class ActionStep extends BaseModel<ActionStepAttributes, ActionStepCreationAttributes> {
  declare name: string;

  declare taskId: number;

  declare index: number;

  declare repositoryId: number;

  declare logIndex: number;

  declare logLength: number;

  declare status: string;

  declare started: Date;

  declare stopped: Date;

  static associate({ ActionTask }: Models) {
    this.belongsTo(ActionTask, { foreignKey: 'taskId' });
  }

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionTask: BelongsToGetAssociationMixin<ActionTask>;

  declare setActionTask: BelongsToSetAssociationMixin<ActionTask, bigint>;

  declare createActionTask: BelongsToCreateAssociationMixin<ActionTask>;
}

ActionStep.init(
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
    modelName: 'ActionStep',
  },
);
