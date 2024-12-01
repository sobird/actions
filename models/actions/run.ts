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
  type HasManyGetAssociationsMixin,
  type HasManySetAssociationsMixin,
  type HasManyAddAssociationMixin,
  type HasManyAddAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type HasManyRemoveAssociationsMixin,
  type HasManyHasAssociationMixin,
  type HasManyHasAssociationsMixin,
  type HasManyCreateAssociationMixin,
  type HasManyCountAssociationsMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionsJob } from '.';
import Status from './status';

/** These are all the attributes in the ActionsRun model */
export type ActionsRunAttributes = InferAttributes<ActionsRun>;

/** Some attributes are optional in `ActionsRun.build` and `ActionsRun.create` calls */
export type ActionsRunCreationAttributes = InferCreationAttributes<ActionsRun>;

export type ActionsJobPrimaryKey = ActionsJob['id'];

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

  declare status: Status;

  declare version: CreationOptional<string>;

  declare started: Date;

  declare stopped: Date;

  declare duration: CreationOptional<number>;

  static async add() {
    const t = await sequelize.transaction();

    // run.index = index; // todo

    return t.commit();
  }

  static associate({ ActionsJob }: Models) {
    this.hasMany(ActionsJob, { foreignKey: 'runId' });
  }

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionsJobs: HasManyGetAssociationsMixin<ActionsJob>;

  /** Remove all previous associations and set the new ones */
  declare setActionsJobs: HasManySetAssociationsMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare addActionsJob: HasManyAddAssociationMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare addActionsJobs: HasManyAddAssociationsMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare removeActionsJob: HasManyRemoveAssociationMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare removeActionsJobs: HasManyRemoveAssociationsMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare hasActionsJob: HasManyHasAssociationMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare hasActionsJobs: HasManyHasAssociationsMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare createActionsJob: HasManyCreateAssociationMixin<ActionsJob>;

  declare countActionsJobs: HasManyCountAssociationsMixin;
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
      type: DataTypes.STRING,
      // values: Status.Values(),
      // defaultValue: Status.Unknown,

      // set(value: Status) {
      //   this.setDataValue('status', value.toString() as unknown as Status);
      // },
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
