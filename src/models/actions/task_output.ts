/**
 * Actions Task Output Model
 *
 * The outputs are bound to a task, so when a completed job is rerun the outputs
 * are reset together with the new task, and old outputs can't leak into it.
 *
 * sobird<i@sobird.me> at 2026/09/13 created.
 */

import {
  DataTypes,
  type Association,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type NonAttribute,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionTask } from '.';

export type ActionTaskOutputCreationAttributes = CreationAttributes<ActionTaskOutput>;

export class ActionTaskOutput extends BaseModel<
  InferAttributes<ActionTaskOutput>,
  InferCreationAttributes<ActionTaskOutput>
> {
  declare taskId: number;
  declare outputKey: string;
  declare outputValue: string;

  declare task?: NonAttribute<ActionTask>;

  declare static associations: {
    task: Association<ActionTaskOutput, ActionTask>;
  };

  static associate({ ActionTask }: Models) {
    this.belongsTo(ActionTask, { as: 'task', foreignKey: 'taskId' });
  }

  declare getTask: BelongsToGetAssociationMixin<ActionTask>;
  declare setTask: BelongsToSetAssociationMixin<ActionTask, bigint>;
  declare createTask: BelongsToCreateAssociationMixin<ActionTask>;

  /** returns the keys of the outputs of the task */
  public static async findKeysByTaskId(taskId: number) {
    const outputs = await this.findAll({ where: { taskId }, attributes: ['outputKey'] });
    return outputs.map((item) => item.outputKey);
  }

  /** inserts a new task output if it does not exist */
  public static async insertIfNotExist(taskId: number, outputKey: string, outputValue: string) {
    await this.findOrCreate({
      defaults: { taskId, outputKey, outputValue },
      where: { taskId, outputKey },
    });
  }
}

ActionTaskOutput.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.BIGINT,
      comment: 'task id',
    },
    outputKey: {
      type: DataTypes.STRING(255),
      comment: 'output key',
    },
    outputValue: {
      type: DataTypes.TEXT,
      comment: 'output value',
    },
  },
  {
    sequelize,
    indexes: [
      {
        name: 'task_id_output_key',
        unique: true,
        fields: ['task_id', 'output_key'],
      },
    ],
  },
);
