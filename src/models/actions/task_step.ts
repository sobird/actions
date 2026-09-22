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
  type CreationOptional,
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
  declare id: CreationOptional<number>;
  declare name: string;
  declare taskId: number;
  declare index: number;
  declare repositoryId: number;
  declare logIndex: number;
  declare logLength: number;
  declare status: string;
  declare startedAt: Date | null;
  declare stoppedAt: Date | null;

  static associate({ ActionTask }: Models) {
    this.belongsTo(ActionTask, { as: 'task', foreignKey: 'taskId' });
  }

  declare static associations: {
    task: Association<ActionTaskStep, ActionTask>;
  };

  declare task?: NonAttribute<ActionTask>;

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getTask: BelongsToGetAssociationMixin<ActionTask>;
  declare setTask: BelongsToSetAssociationMixin<ActionTask, number>;
  declare createTask: BelongsToCreateAssociationMixin<ActionTask>;
}

ActionTaskStep.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      comment: 'step name',
    },
    taskId: {
      type: DataTypes.BIGINT,
      comment: 'task id',
    },
    index: {
      type: DataTypes.INTEGER,
      comment: 'task index',
    },
    repositoryId: {
      type: DataTypes.BIGINT,
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
