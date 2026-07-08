/**
 * Actions Run ActionRunJob Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:33:36 created.
 */

import {
  DataTypes,
  Association,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
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

import type { Models, ActionTask, ActionRun } from '.';

export type ActionRunJobCreationAttributes = CreationAttributes<ActionRunJob>;

/**
 * ActionRunJob represents a job of a run
 */
export class ActionRunJob extends BaseModel<InferAttributes<ActionRunJob>, InferCreationAttributes<ActionRunJob>> {
  declare runId: number;

  declare name: string;

  declare ownerId: number;

  declare repositoryId: number;

  declare commitSha: string;

  declare isForkPullRequest: boolean;

  declare attempt: number;

  declare workflowPayload: CreationOptional<Blob>;

  /** job id in workflow, not job's id */
  declare jobId: string;

  /** the latest task of the job */
  declare taskId: number;

  declare needs: CreationOptional<string[]>;

  declare runsOn: CreationOptional<string[]>;

  declare status: number;

  declare started: Date;

  declare stopped: Date;

  declare Run?: NonAttribute<ActionRun>;

  static associate({ ActionRun, ActionTask }: Models) {
    this.belongsTo(ActionRun, { foreignKey: 'runId' });
    this.hasMany(ActionTask, { foreignKey: 'jobId' });
  }

  declare static associations: {
    Run: Association<ActionRunJob, ActionRun>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionTasks: HasManyGetAssociationsMixin<ActionTask>;

  /** Remove all previous associations and set the new ones */
  declare setActionTasks: HasManySetAssociationsMixin<ActionTask, bigint>;

  declare addActionTask: HasManyAddAssociationMixin<ActionTask, bigint>;

  declare addActionTasks: HasManyAddAssociationsMixin<ActionTask, bigint>;

  declare removeActionTask: HasManyRemoveAssociationMixin<ActionTask, bigint>;

  declare removeActionTasks: HasManyRemoveAssociationsMixin<ActionTask, bigint>;

  declare hasActionTask: HasManyHasAssociationMixin<ActionTask, bigint>;

  declare hasActionTasks: HasManyHasAssociationsMixin<ActionTask, bigint>;

  declare createActionTask: HasManyCreateAssociationMixin<ActionTask>;

  declare countActionTasks: HasManyCountAssociationsMixin;

  // ActionRun

  declare getActionRun: BelongsToGetAssociationMixin<ActionRun>;

  declare setActionRun: BelongsToSetAssociationMixin<ActionRun, bigint>;

  declare createActionRun: BelongsToCreateAssociationMixin<ActionRun>;
}

ActionRunJob.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    runId: {
      type: DataTypes.INTEGER,
    },

    name: {
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
    commitSha: {
      type: DataTypes.STRING,
    },
    isForkPullRequest: {
      type: DataTypes.BOOLEAN,
    },
    attempt: {
      type: DataTypes.INTEGER,
    },
    workflowPayload: {
      type: DataTypes.BLOB,
    },
    jobId: {
      type: DataTypes.CHAR(255),
    },
    taskId: {
      type: DataTypes.INTEGER,
      comment: 'the latest task of the job',
    },
    needs: {
      type: DataTypes.TEXT,
    },
    runsOn: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.TINYINT,
    },
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,
  },
  {
    sequelize,
  },
);
