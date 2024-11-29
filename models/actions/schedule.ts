/**
 * Actions Schedule Model
 *
 * sobird<i@sobird.me> at 2024/11/25 17:00:54 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionsSchedule model */
export type ActionsScheduleAttributes = InferAttributes<ActionsSchedule>;

/** Some attributes are optional in `ActionsSchedule.build` and `ActionsSchedule.create` calls */
export type ActionsScheduleCreationAttributes = InferCreationAttributes<ActionsSchedule>;

class ActionsSchedule extends BaseModel<ActionsScheduleAttributes, ActionsScheduleCreationAttributes> {
  declare id: CreationOptional<number>;

  declare title: string;

  declare specs: string[];

  declare ownerId: number;

  declare repositoryId: number;

  declare workflowId: string;

  declare triggerUserId: number;

  declare eventPayload: Blob;

  declare ref: string;

  declare commitSha: string;

  declare content: string;
}

ActionsSchedule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
    },
    specs: {
      type: DataTypes.STRING,
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
    },
    triggerUserId: {
      type: DataTypes.INTEGER,
    },
    eventPayload: {
      type: DataTypes.BLOB,
    },
    ref: {
      type: DataTypes.CHAR(255),
    },
    commitSha: {
      type: DataTypes.CHAR(255),
    },
    content: {
      type: DataTypes.TEXT,
    },

  },
  {
    sequelize,
    modelName: 'ActionsSchedule',
  },
);

// ActionsSchedule.beforeCreate((model) => {

// });

export default ActionsSchedule;
