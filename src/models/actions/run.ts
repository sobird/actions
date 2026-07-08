/**
 * Actions Run Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:10:16 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
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

export type ActionRunCreationAttributes = CreationAttributes<ActionRun>;

export class ActionRun extends BaseModel<InferAttributes<ActionRun>, InferCreationAttributes<ActionRun>> {
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

  declare rawConcurrency: CreationOptional<string>;
  declare workflowRepoId: CreationOptional<bigint>;
  declare workflowCommitSha: CreationOptional<string>;
  declare isScopedRun: CreationOptional<boolean>;

  declare started: Date;
  declare stopped: Date;

  declare previousDuration: CreationOptional<bigint>;
  declare duration: CreationOptional<number>;

  declare latestAttemptId: CreationOptional<bigint>;

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
  declare setActionRunJobs: HasManySetAssociationsMixin<ActionRunJob, bigint>;

  declare addActionRunJob: HasManyAddAssociationMixin<ActionRunJob, bigint>;

  declare addActionRunJobs: HasManyAddAssociationsMixin<ActionRunJob, bigint>;

  declare removeActionRunJob: HasManyRemoveAssociationMixin<ActionRunJob, bigint>;

  declare removeActionRunJobs: HasManyRemoveAssociationsMixin<ActionRunJob, bigint>;

  declare hasActionRunJob: HasManyHasAssociationMixin<ActionRunJob, bigint>;

  declare hasActionRunJobs: HasManyHasAssociationsMixin<ActionRunJob, bigint>;

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
      allowNull: false,
    },
    triggerUserId: {
      type: DataTypes.BIGINT,
    },
    scheduleId: {
      type: DataTypes.BIGINT,
    },
    ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    commitSha: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    isForkPullRequest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    needApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approvedBy: {
      type: DataTypes.BIGINT,
    },
    eventName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eventPayload: {
      type: DataTypes.TEXT,
    },
    triggerEvent: {
      type: DataTypes.STRING,
    },
    status: {
      // https://github.com/sequelize/sequelize/issues/5765
      type: DataTypes.ENUM,
      values: Status.names(),
      defaultValue: Status.Unknown.toString(),
      get() {
        return Status.from(this.getDataValue('status') as unknown as string);
      },
      set(value: Status) {
        this.setDataValue('status', value.toString() as unknown as Status);
      },
      validate: {
        isIn: {
          args: [Status.names()],
          msg: `Must be in ${Status.names()}`,
        },
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rawConcurrency: {
      type: DataTypes.STRING,
    },
    workflowRepoId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    workflowCommitSha: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
    },
    isScopedRun: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    previousDuration: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    duration: DataTypes.BIGINT,
    latestAttemptId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,
  },
  {
    sequelize,
    indexes: [
      {
        name: 'repo_index_unique',
        unique: true,
        fields: ['repository_id', 'index'],
      },
      {
        name: 'action_run_repo_id_index',
        fields: ['repository_id'],
      },
      {
        name: 'action_run_owner_id_index',
        fields: ['owner_id'],
      },
      {
        name: 'action_run_workflow_id_index',
        fields: ['workflow_id'],
      },
      {
        name: 'action_run_trigger_user_id_index',
        fields: ['trigger_user_id'],
      },
      {
        name: 'action_run_ref_index',
        fields: ['ref'],
      },
      {
        name: 'action_run_approved_by_index',
        fields: ['approved_by'],
      },
      {
        name: 'action_run_status_index',
        fields: ['status'],
      },
      {
        name: 'action_run_latest_attempt_id_index',
        fields: ['latest_attempt_id'],
      },
    ],
  },
);
