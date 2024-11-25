/**
 * Actions Task Model
 *
 * sobird<i@sobird.me> at 2024/11/23 12:21:49 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes, CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import ActionsRunner from './runner';

/** These are all the attributes in the ActionsTask model */
export type ActionsTaskAttributes = InferAttributes<ActionsTask>;

/** Some attributes are optional in `ActionsTask.build` and `ActionsTask.create` calls */
export type ActionsTaskCreationAttributes = InferCreationAttributes<ActionsTask>;

class ActionsTask extends BaseModel<ActionsTaskAttributes, ActionsTaskCreationAttributes> {
  declare jobId: number;

  declare attempt: number;

  declare runnerId: number;

  declare status: string;

  declare started: Date;

  declare stopped: Date;

  declare repositoryId: number;

  declare ownerId: number;

  declare commitSha: string;

  declare isForkPullRequest: boolean;

  declare token: string;

  declare tokenHash: string;

  declare tokenSalt: string;

  declare tokenLastEight: string;

  declare logFilename: string;

  declare logInStorage: boolean;

  declare logLength: number;

  declare logSize: number;

  declare logIndexes: number;

  declare logExpired: Date;

  // static associate({ User }) {
  //   this.belongsTo(User, { onDelete: 'cascade' });
  // }

  public static async createForRunner(runner: ActionsRunner) {
    const t = sequelize.transaction();
    const { ownerId, repositoryId } = runner;
  }
}

ActionsTask.init(
  {
    jobId: {
      type: DataTypes.INTEGER,
    },
    attempt: {
      type: DataTypes.INTEGER,
    },
    runnerId: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING,
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
      defaultValue: 0,
    },

    token: {
      type: DataTypes.STRING,
    },
    tokenHash: {
      type: DataTypes.STRING,
    },
    tokenSalt: {
      type: DataTypes.STRING,
    },
    tokenLastEight: DataTypes.STRING,
    logFilename: DataTypes.STRING,
    logInStorage: {
      type: DataTypes.BOOLEAN,
    },
    logLength: {
      type: DataTypes.INTEGER,
    },
    logSize: {
      type: DataTypes.INTEGER,
      comment: 'Store labels defined in state file (default: .runner file) of `runner`',
    },
    logIndexes: DataTypes.INTEGER,
    logExpired: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'ActionsTask',
  },
);

// ActionsTask.beforeCreate((model) => {

// });

export default ActionsTask;
