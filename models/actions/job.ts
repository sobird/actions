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
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import { type Models } from '.';
import type Run from './run';

/** These are all the attributes in the ActionsJob model */
export type ActionsJobAttributes = InferAttributes<ActionsJob>;

/** Some attributes are optional in `ActionsJob.build` and `ActionsJob.create` calls */
export type ActionsJobCreationAttributes = InferCreationAttributes<ActionsJob>;

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

  static associate({ Run, Task }: Models) {
    this.belongsTo(Run, { foreignKey: 'runId' });
    this.hasMany(Task, { foreignKey: 'jobId' });
  }

  declare static associations: {
    Run: Association<ActionsJob, Run>;
  };
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
