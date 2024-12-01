/**
 * Actions Run ActionsJob Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:33:36 created.
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

import type { Models, ActionsTask, ActionsRun } from '.';
import type Run from './run';

/** These are all the attributes in the ActionsJob model */
export type ActionsJobAttributes = InferAttributes<ActionsJob>;

/** Some attributes are optional in `ActionsJob.build` and `ActionsJob.create` calls */
export type ActionsJobCreationAttributes = InferCreationAttributes<ActionsJob>;

export type ActionsTaskPrimaryKey = ActionsTask['id'];
export type ActionsRunPrimaryKey = ActionsRun['id'];

class ActionsJob extends BaseModel<ActionsJobAttributes, ActionsJobCreationAttributes> {
  declare id: CreationOptional<number>;

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

  declare Run?: NonAttribute<Run>;

  static associate({ ActionsRun, ActionsTask }: Models) {
    this.belongsTo(ActionsRun, { foreignKey: 'runId' });
    this.hasMany(ActionsTask, { foreignKey: 'jobId' });
  }

  declare static associations: {
    Run: Association<ActionsJob, Run>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionsTasks: HasManyGetAssociationsMixin<ActionsTask>;

  /** Remove all previous associations and set the new ones */
  declare setActionsTasks: HasManySetAssociationsMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare addActionsTask: HasManyAddAssociationMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare addActionsTasks: HasManyAddAssociationsMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare removeActionsTask: HasManyRemoveAssociationMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare removeActionsTasks: HasManyRemoveAssociationsMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare hasActionsTask: HasManyHasAssociationMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare hasActionsTasks: HasManyHasAssociationsMixin<ActionsTask, ActionsTaskPrimaryKey>;

  declare createActionsTask: HasManyCreateAssociationMixin<ActionsTask>;

  declare countActionsTasks: HasManyCountAssociationsMixin;

  // ActionsRun

  declare getActionsRun: BelongsToGetAssociationMixin<ActionsRun>;

  declare setActionsRun: BelongsToSetAssociationMixin<ActionsRun, ActionsRunPrimaryKey>;

  declare createActionsRun: BelongsToCreateAssociationMixin<ActionsRun>;
}

ActionsJob.init(
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

    // duration: DataTypes.BIGINT,
  },
  {
    sequelize,
    modelName: 'ActionsJob',
  },
);

// ActionsJob.beforeCreate((model) => {

// });

export default ActionsJob;
