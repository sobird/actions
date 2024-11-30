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
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import { type Models } from '.';
import ActionsRunJob from './job';
import ActionsRunner from './runner';
import ActionsStep from './step';

/** These are all the attributes in the ActionsTask model */
export type ActionsTaskAttributes = InferAttributes<ActionsTask>;

/** Some attributes are optional in `ActionsTask.build` and `ActionsTask.create` calls */
export type ActionsTaskCreationAttributes = InferCreationAttributes<ActionsTask>;
class ActionsTask extends BaseModel<ActionsTaskAttributes, ActionsTaskCreationAttributes> {
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

  declare token?: string;

  declare tokenHash: CreationOptional<string>;

  declare tokenSalt: CreationOptional<string>;

  // declare tokenLastEight: CreationOptional<string>;

  declare logFilename: string;

  declare logInStorage: boolean;

  declare logLength: number;

  declare logSize: number;

  // declare logIndexes: number;

  declare logExpired: Boolean;

  declare Job?: NonAttribute<ActionsRunJob>;

  declare Steps?: NonAttribute<ActionsStep[]>;

  static associate({ Job, Runner, Step }: Models) {
    this.belongsTo(Job, { foreignKey: 'jobId' });
    this.belongsTo(Runner, { foreignKey: 'runnerId' });
    this.hasMany(Step, { foreignKey: 'taskId' });
  }

  declare static associations: {
    Job: Association<ActionsTask, ActionsRunJob>;
  };

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
    runnerId: {
      type: DataTypes.INTEGER,
    },
    attempt: {
      type: DataTypes.INTEGER,
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
    // tokenLastEight: DataTypes.STRING,
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
    modelName: 'ActionsTask',
  },
);

// ActionsTask.beforeCreate((model) => {

// });

export default ActionsTask;
