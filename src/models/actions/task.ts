/**
 * Actions Task Model
 *
 * sobird<i@sobird.me> at 2024/11/23 12:21:49 created.
 */

import {
  DataTypes,
  Association,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type NonAttribute,
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
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionRunJob, ActionRunner, ActionStep } from '.';

/** These are all the attributes in the ActionTask model */
export type ActionTaskAttributes = InferAttributes<ActionTask>;

/** Some attributes are optional in `ActionTask.build` and `ActionTask.create` calls */
export type ActionTaskCreationAttributes = InferCreationAttributes<ActionTask>;

export class ActionTask extends BaseModel<ActionTaskAttributes, ActionTaskCreationAttributes> {
  declare jobId: number;

  declare runnerId: number;

  declare attempt: number;

  declare status: number;

  declare started: Date;

  declare stopped: Date;

  declare repositoryId: number;

  declare ownerId: number;

  declare commitSha: string;

  declare isForkPullRequest: boolean;

  declare tokenHash: CreationOptional<string>;

  declare tokenSalt: CreationOptional<string>;

  declare tokenLastEight: CreationOptional<string>;

  declare logFilename: string;

  declare logInStorage: boolean;

  declare logLength: number;

  declare logSize: number;

  // declare logIndexes: number;

  declare logExpired: boolean;

  declare Job?: NonAttribute<ActionRunJob>;

  declare Steps?: NonAttribute<ActionStep[]>;

  static associate({ ActionRunJob, ActionRunner, ActionStep }: Models) {
    this.belongsTo(ActionRunJob, { foreignKey: 'jobId' });
    this.belongsTo(ActionRunner, { foreignKey: 'runnerId' });
    this.hasMany(ActionStep, { foreignKey: 'taskId' });
  }

  declare static associations: {
    Job: Association<ActionTask, ActionRunJob>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionSteps: HasManyGetAssociationsMixin<ActionStep>;

  /** Remove all previous associations and set the new ones */
  declare setActionSteps: HasManySetAssociationsMixin<ActionStep, bigint>;

  declare addActionStep: HasManyAddAssociationMixin<ActionStep, bigint>;

  declare addActionSteps: HasManyAddAssociationsMixin<ActionStep, bigint>;

  declare removeActionStep: HasManyRemoveAssociationMixin<ActionStep, bigint>;

  declare removeActionSteps: HasManyRemoveAssociationsMixin<ActionStep, bigint>;

  declare hasActionStep: HasManyHasAssociationMixin<ActionStep, bigint>;

  declare hasActionSteps: HasManyHasAssociationsMixin<ActionStep, bigint>;

  declare createActionStep: HasManyCreateAssociationMixin<ActionStep>;

  declare countActionSteps: HasManyCountAssociationsMixin;

  // ActionRunJob
  declare getActionRunJob: BelongsToGetAssociationMixin<ActionRunJob>;

  declare setActionRunJob: BelongsToSetAssociationMixin<ActionRunJob, bigint>;

  declare createActionRunJob: BelongsToCreateAssociationMixin<ActionRunJob>;

  // ActionRunner
  declare getActionRunner: BelongsToGetAssociationMixin<ActionRunner>;

  declare setActionRunner: BelongsToSetAssociationMixin<ActionRunner, bigint>;

  declare createActionRunner: BelongsToCreateAssociationMixin<ActionRunner>;

  public static async createForRunner(_runner: ActionRunner) {
    const t = await sequelize.transaction();
    // const { ownerId, repositoryId } = runner;

    // const jobs = this

    return t.commit();
  }
}

ActionTask.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    runnerId: {
      type: DataTypes.BIGINT,
    },
    attempt: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.TINYINT,
    },
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,

    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    commitSha: {
      type: DataTypes.STRING,
    },
    isForkPullRequest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    tokenHash: {
      type: DataTypes.STRING,
    },
    tokenSalt: {
      type: DataTypes.STRING,
    },
    tokenLastEight: {
      type: DataTypes.STRING,
    },
    logFilename: DataTypes.STRING,
    logInStorage: {
      type: DataTypes.BOOLEAN,
    },
    logLength: {
      type: DataTypes.INTEGER,
    },
    logSize: {
      type: DataTypes.INTEGER,
      comment: 'log size',
    },
    // logIndexes: DataTypes.INTEGER,
    logExpired: DataTypes.BOOLEAN,
  },
  {
    sequelize,
    modelName: 'ActionTask',
    indexes: [
      { name: 'idx_action_task_runner_id', fields: ['runnerId'] },
      { name: 'idx_action_task_status', fields: ['status'] },
      { name: 'idx_action_task_started', fields: ['started'] },
      { name: 'idx_action_task_repo_id', fields: ['repoId'] },
      { name: 'idx_action_task_owner_id', fields: ['ownerId'] },
      { name: 'idx_action_task_commit_sha', fields: ['commitSha'] },
      { name: 'idx_action_task_updated', fields: ['updated'] },

      // 复合索引：对应原 Go 中的 `xorm:"index token_last_eight"` 和状态查询
      { name: 'idx_token_last_eight_status', fields: ['tokenLastEight', 'status'] },

      // 复合索引：对应原 Go 中的 `xorm:"index(stopped_log_expired)"`
      { name: 'stopped_log_expired', fields: ['stopped', 'logExpired'] },
    ],
  },
);
