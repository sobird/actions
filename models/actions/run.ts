/**
 * Actions Run Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:10:16 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import { type Models } from '.';

/** These are all the attributes in the ActionsRun model */
export type ActionsRunAttributes = InferAttributes<ActionsRun>;

/** Some attributes are optional in `ActionsRun.build` and `ActionsRun.create` calls */
export type ActionsRunCreationAttributes = InferCreationAttributes<ActionsRun>;

class ActionsRun extends BaseModel<ActionsRunAttributes, ActionsRunCreationAttributes> {
  declare id: CreationOptional<number>;

  declare title: string;

  declare ownerId: number;

  declare repositoryId: number;

  declare workflowId: string;

  declare index: number;

  declare triggerUserId: number;

  declare scheduleId: CreationOptional<number>;

  declare ref: string;

  declare commitSha: string;

  declare isForkPullRequest: boolean;

  declare needApproval: boolean;

  declare approvedBy: number;

  declare eventName: string;

  declare eventPayload: CreationOptional<string>;

  declare triggerEvent: CreationOptional<string>;

  declare status: number;

  declare version: CreationOptional<string>;

  declare started: Date;

  declare stopped: Date;

  declare duration: CreationOptional<number>;

  static associate({ Job }: Models) {
    this.hasMany(Job, { foreignKey: 'runId' });
  }
}

ActionsRun.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    workflowId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    index: {
      type: DataTypes.BIGINT,
    },
    triggerUserId: {
      type: DataTypes.BIGINT,
    },
    scheduleId: {
      type: DataTypes.INTEGER,
    },
    ref: {
      type: DataTypes.STRING,
    },
    commitSha: {
      type: DataTypes.STRING,
    },
    isForkPullRequest: {
      type: DataTypes.BOOLEAN,
    },
    needApproval: {
      type: DataTypes.BOOLEAN,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
    },
    eventName: DataTypes.STRING,
    eventPayload: {
      type: DataTypes.TEXT,
    },
    triggerEvent: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.INTEGER,
    },
    version: {
      type: DataTypes.STRING(64),
    },
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,

    duration: DataTypes.BIGINT,
  },
  {
    sequelize,
    modelName: 'ActionsRun',
  },
);

// ActionsRun.beforeCreate((model) => {

// });

export default ActionsRun;
