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

  declare name: string;

  // declare runId: number;

  declare ownerId: number;

  declare repositoryId: number;

  declare commitSha: string;

  declare isForkPullRequest: boolean;

  declare attempt: number;

  declare workflowPayload: Blob;

  /** job id in workflow, not job's id */
  declare jobId: string;

  declare needs: string[];

  declare runsOn: string[];

  declare taskId: number;

  declare status: string;

  declare started: Date;

  declare stopped: Date;

  declare Run?: NonAttribute<Run>;

  static associate({ Run }: Models) {
    this.belongsTo(Run, { foreignKey: 'runId' });
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
    name: {
      type: DataTypes.STRING,
    },
    // runId: {
    //   type: DataTypes.INTEGER,
    // },
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
    needs: {
      type: DataTypes.TEXT,
    },
    runsOn: {
      type: DataTypes.STRING,
    },
    taskId: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING(64),
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
