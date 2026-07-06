/**
 * ActionVariable represents a variable that can be used in actions
 *
 * sobird<i@sobird.me> at 2024/11/28 11:00:15 created.
 */

import { DataTypes, type InferAttributes, InferCreationAttributes } from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionVariable model */
export type ActionVariableAttributes = InferAttributes<ActionVariable>;

/** Some attributes are optional in `ActionVariable.build` and `ActionVariable.create` calls */
export type ActionVariableCreationAttributes = InferCreationAttributes<ActionVariable>;

export const VARIABLE_DATA_MAX_LENGTH = 65536;
export const VARIABLE_DESCRIPTION_MAX_LENGTH = 4096;

/**
 * ActionVariable represents a variable that can be used in actions
 *
 * It can be:
 *  1. global variable, OwnerID is 0 and RepoID is 0
 *  2. org/user level variable, OwnerID is org/user ID and RepoID is 0
 *  3. repo level variable, OwnerID is 0 and RepoID is repo ID
 *
 * Please note that it's not acceptable to have both OwnerID and RepoID to be non-zero,
 * or it will be complicated to find variables belonging to a specific owner.
 * For example, conditions like `OwnerID = 1` will also return variable {OwnerID: 1, RepoID: 1},
 * but it's a repo level variable, not an org/user level variable.
 * To avoid this, make it clear with {OwnerID: 0, RepoID: 1} for repo level variables.
 */
class ActionVariable extends BaseModel<ActionVariableAttributes, ActionVariableCreationAttributes> {
  declare id: bigint;
  declare ownerId: number;
  declare repositoryId: number;
  declare name: string;
  declare data: string;
  declare description: string;
}

ActionVariable.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      comment: 'repository id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      set(val: string) {
        this.setDataValue('name', val.toUpperCase());
      },
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
      set(val: string) {
        if (Array.from(val).length > VARIABLE_DATA_MAX_LENGTH) {
          throw new Error('InvalidArgument: data too long');
        }
        this.setDataValue('data', val);
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(val: string) {
        if (val) {
          // 自动截断超长部分
          const truncated = Array.from(val).slice(0, VARIABLE_DESCRIPTION_MAX_LENGTH).join('');
          this.setDataValue('description', truncated);
        } else {
          this.setDataValue('description', val);
        }
      },
    },
  },
  {
    sequelize,
    indexes: [
      {
        name: 'owner_repo_name',
        unique: true,
        fields: ['owner_id', 'repository_id', 'name'],
      },
      {
        name: 'idx_repo_id',
        fields: ['repository_id'],
      },
    ],
    hooks: {
      beforeValidate(instance) {
        if (instance.ownerId !== 0 && instance.repositoryId !== 0) {
          instance.ownerId = 0;
        }
      },
    },
  },
);

export default ActionVariable;
