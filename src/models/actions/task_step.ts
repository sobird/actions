/**
 * Actions Secret Model
 *
 * sobird<i@sobird.me> at 2024/11/28 10:14:19 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type NonAttribute,
  type Association,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionTask } from '.';

export type ActionTaskStepCreationAttributes = CreationAttributes<ActionTaskStep>;

export class ActionTaskStep extends BaseModel<
  InferAttributes<ActionTaskStep>,
  InferCreationAttributes<ActionTaskStep>
> {
  declare name: string;
  declare taskId: number;
  declare index: number;
  declare repositoryId: number;
  declare logIndex: number;
  declare logLength: number;
  declare status: string;
  declare startedAt: Date;
  declare stoppedAt: Date;

  static associate({ ActionTask }: Models) {
    this.belongsTo(ActionTask, { foreignKey: 'taskId' });
  }

  declare static associations: {
    ActionTask: Association<ActionTaskStep, ActionTask>;
  };

  declare Task?: NonAttribute<ActionTask[]>;

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionTask: BelongsToGetAssociationMixin<ActionTask>;
  declare setActionTask: BelongsToSetAssociationMixin<ActionTask, bigint>;
  declare createActionTask: BelongsToCreateAssociationMixin<ActionTask>;
}

ActionTaskStep.init(
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
    startedAt: DataTypes.DATE,
    stoppedAt: DataTypes.DATE,
  },
  {
    sequelize,
    indexes: [
      {
        fields: ['repository_id'],
      },
      {
        fields: ['status'],
      },
      {
        unique: true,
        name: 'task_index',
        fields: ['task_id', 'index'],
      },
    ],
  },
);
