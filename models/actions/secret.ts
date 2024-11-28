/**
 * Actions Secret Model
 *
 * sobird<i@sobird.me> at 2024/11/28 10:14:19 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';
import { secret } from '@/utils';

import type Task from './task';

/** These are all the attributes in the ActionsSecret model */
export type ActionsSecretAttributes = InferAttributes<ActionsSecret>;

/** Some attributes are optional in `ActionsSecret.build` and `ActionsSecret.create` calls */
export type ActionsSecretCreationAttributes = InferCreationAttributes<ActionsSecret>;

class ActionsSecret extends BaseModel<ActionsSecretAttributes, ActionsSecretCreationAttributes> {
  declare ownerId: number;

  declare repositoryId: number;

  declare label: string;

  declare value: string;

  // static associate({ User }) {
  //   this.belongsTo(User, { onDelete: 'cascade' });
  // }

  public static async findAllForTask(task: Task) {
    //
    console.log('task', task);
  }
}

ActionsSecret.init(
  {
    ownerId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.INTEGER,
      comment: 'repository id',
    },
    label: {
      type: DataTypes.CHAR,
      unique: true,
      allowNull: false,
      comment: 'actions secret label',
      set(value: string) {
        this.setDataValue('value', value.toUpperCase());
      },
    },
    value: {
      type: DataTypes.TEXT,
      comment: 'actions secret value',
      set(value: string) {
        this.setDataValue('value', secret.encrypt(this.getDataValue('label'), value));
      },
      get() {
        return secret.encrypt(this.getDataValue('label'), this.getDataValue('value'));
      },
    },
  },
  {
    sequelize,
    modelName: 'ActionsSecret',
  },
);

export default ActionsSecret;
