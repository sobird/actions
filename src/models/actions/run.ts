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

import type { Models, ActionRunJob } from '.';
import { Status } from './status';

export type ActionRunAttributes = InferAttributes<ActionRun>;
export type ActionRunCreationAttributes = InferCreationAttributes<ActionRun>;

export type ActionRunJobPrimaryKey = ActionRunJob['id'];

export class ActionRun extends BaseModel<ActionRunAttributes, ActionRunCreationAttributes> {
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

  static associate({ ActionRunJob }: Models) {
    this.hasMany(ActionRunJob, { foreignKey: 'runId' });
  }

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionRunJobs: HasManyGetAssociationsMixin<ActionRunJob>;

  /** Remove all previous associations and set the new ones */
  declare setActionRunJobs: HasManySetAssociationsMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare addActionRunJob: HasManyAddAssociationMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare addActionRunJobs: HasManyAddAssociationsMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare removeActionRunJob: HasManyRemoveAssociationMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare removeActionRunJobs: HasManyRemoveAssociationsMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare hasActionRunJob: HasManyHasAssociationMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare hasActionRunJobs: HasManyHasAssociationsMixin<ActionRunJob, ActionRunJobPrimaryKey>;

  declare createActionRunJob: HasManyCreateAssociationMixin<ActionRunJob>;

  declare countActionRunJobs: HasManyCountAssociationsMixin;

  static validate() {
    throw Error('dd');
  }
}

ActionRun.init(
  {
    id: {
      type: DataTypes.BIGINT,
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
      // https://github.com/sequelize/sequelize/issues/5765
      type: DataTypes.ENUM,
      values: Status.values(),
      defaultValue: Status.Unknown.toString(),
      set(value: Status) {
        this.setDataValue('status', value.toString() as unknown as Status);
      },
      validate: {
        isIn: {
          args: [Status.values()],
          msg: `Must be in ${Status.values()}`,
        },
      },
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
    modelName: 'ActionRun',
  },
);
