/**
 * Actions Secret Model
 *
 * sobird<i@sobird.me> at 2024/11/28 11:00:15 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionsVariable model */
export type ActionsVariableAttributes = InferAttributes<ActionsVariable>;

/** Some attributes are optional in `ActionsVariable.build` and `ActionsVariable.create` calls */
export type ActionsVariableCreationAttributes = InferCreationAttributes<ActionsVariable>;

class ActionsVariable extends BaseModel<ActionsVariableAttributes, ActionsVariableCreationAttributes> {
  declare ownerId: number;

  declare repositoryId: number;

  declare label: string;

  declare value: string;
}

ActionsVariable.init(
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
    },
  },
  {
    sequelize,
    modelName: 'ActionsVariable',
  },
);

export default ActionsVariable;
