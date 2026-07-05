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
import type Run from './run';

/** These are all the attributes in the ActionRunJob model */
export type ActionRunJobAttributes = InferAttributes<ActionRunJob>;

/** Some attributes are optional in `ActionRunJob.build` and `ActionRunJob.create` calls */
export type ActionRunJobCreationAttributes = InferCreationAttributes<ActionRunJob>;

export type ActionTaskPrimaryKey = ActionTask['id'];
export type ActionRunPrimaryKey = ActionRun['id'];

/**
 * ActionRunJob represents a job of a run
 */
class ActionRunJob extends BaseModel<ActionRunJobAttributes, ActionRunJobCreationAttributes> {
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

  static associate({ ActionRun, ActionTask }: Models) {
    this.belongsTo(ActionRun, { foreignKey: 'runId' });
    this.hasMany(ActionTask, { foreignKey: 'jobId' });
  }

  declare static associations: {
    Run: Association<ActionRunJob, Run>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionTasks: HasManyGetAssociationsMixin<ActionTask>;

  /** Remove all previous associations and set the new ones */
  declare setActionTasks: HasManySetAssociationsMixin<ActionTask, ActionTaskPrimaryKey>;

  declare addActionTask: HasManyAddAssociationMixin<ActionTask, ActionTaskPrimaryKey>;

  declare addActionTasks: HasManyAddAssociationsMixin<ActionTask, ActionTaskPrimaryKey>;

  declare removeActionTask: HasManyRemoveAssociationMixin<ActionTask, ActionTaskPrimaryKey>;

  declare removeActionTasks: HasManyRemoveAssociationsMixin<ActionTask, ActionTaskPrimaryKey>;

  declare hasActionTask: HasManyHasAssociationMixin<ActionTask, ActionTaskPrimaryKey>;

  declare hasActionTasks: HasManyHasAssociationsMixin<ActionTask, ActionTaskPrimaryKey>;

  declare createActionTask: HasManyCreateAssociationMixin<ActionTask>;

  declare countActionTasks: HasManyCountAssociationsMixin;

  // ActionRun

  declare getActionRun: BelongsToGetAssociationMixin<ActionRun>;

  declare setActionRun: BelongsToSetAssociationMixin<ActionRun, ActionRunPrimaryKey>;

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

export default ActionRunJob;
