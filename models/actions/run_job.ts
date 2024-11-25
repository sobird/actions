/**
 * Actions Run Job Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:33:36 created.
 */

import {
  DataTypes,
  Association,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';
import { type Models, type RunJobModel } from '@/models';

/** These are all the attributes in the ActionsRunJob model */
export type ActionsRunJobAttributes = InferAttributes<ActionsRunJob>;

/** Some attributes are optional in `ActionsRunJob.build` and `ActionsRunJob.create` calls */
export type ActionsRunJobCreationAttributes = InferCreationAttributes<ActionsRunJob>;

class ActionsRunJob extends BaseModel<ActionsRunJobAttributes, ActionsRunJobCreationAttributes> {
  declare id: CreationOptional<number>;

  declare name: string;

  declare runId: number;

  declare ownerId: number;

  declare repositoryId: number;

  declare commitSha: string;

  declare isForkPullRequest: boolean;

  declare attempt: number;

  declare workflowPayload: Blob;

  declare jobId: string;

  declare needs: string[];

  declare runsOn: string[];

  declare taskId: number;

  declare status: string;

  declare started: Date;

  declare stopped: Date;

  static associate({ Run }: Models) {
    // this.belongsTo(Run, { onDelete: 'cascade' });
  }

  declare static associations: {
    Run: Association<ActionsRunJob, RunJobModel>;
  };
}

ActionsRunJob.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    runId: {
      type: DataTypes.INTEGER,
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
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

    duration: DataTypes.BIGINT,
  },
  {
    sequelize,
    modelName: 'ActionsRunJob',
  },
);

// ActionsRunJob.beforeCreate((model) => {

// });

export default ActionsRunJob;
