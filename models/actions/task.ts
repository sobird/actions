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

import type {
  Models, ActionsJob, ActionsRunner, ActionsStep,
} from '.';

/** These are all the attributes in the ActionsTask model */
export type ActionsTaskAttributes = InferAttributes<ActionsTask>;

/** Some attributes are optional in `ActionsTask.build` and `ActionsTask.create` calls */
export type ActionsTaskCreationAttributes = InferCreationAttributes<ActionsTask>;

export type ActionsStepPrimaryKey = ActionsStep['id'];
export type ActionsJobPrimaryKey = ActionsJob['id'];
export type ActionsRunnerPrimaryKey = ActionsRunner['id'];

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

  declare Job?: NonAttribute<ActionsJob>;

  declare Steps?: NonAttribute<ActionsStep[]>;

  static associate({ ActionsJob, ActionsRunner, ActionsStep }: Models) {
    this.belongsTo(ActionsJob, { foreignKey: 'jobId' });
    this.belongsTo(ActionsRunner, { foreignKey: 'runnerId' });
    this.hasMany(ActionsStep, { foreignKey: 'taskId' });
  }

  declare static associations: {
    Job: Association<ActionsTask, ActionsJob>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionsSteps: HasManyGetAssociationsMixin<ActionsStep>;

  /** Remove all previous associations and set the new ones */
  declare setActionsSteps: HasManySetAssociationsMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare addActionsStep: HasManyAddAssociationMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare addActionsSteps: HasManyAddAssociationsMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare removeActionsStep: HasManyRemoveAssociationMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare removeActionsSteps: HasManyRemoveAssociationsMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare hasActionsStep: HasManyHasAssociationMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare hasActionsSteps: HasManyHasAssociationsMixin<ActionsStep, ActionsStepPrimaryKey>;

  declare createActionsStep: HasManyCreateAssociationMixin<ActionsStep>;

  declare countActionsSteps: HasManyCountAssociationsMixin;

  // ActionsJob
  declare getActionsJob: BelongsToGetAssociationMixin<ActionsJob>;

  declare setActionsJob: BelongsToSetAssociationMixin<ActionsJob, ActionsJobPrimaryKey>;

  declare createActionsJob: BelongsToCreateAssociationMixin<ActionsJob>;

  // ActionsRunner
  declare getActionsRunner: BelongsToGetAssociationMixin<ActionsRunner>;

  declare setActionsRunner: BelongsToSetAssociationMixin<ActionsRunner, ActionsRunnerPrimaryKey>;

  declare createActionsRunner: BelongsToCreateAssociationMixin<ActionsRunner>;

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
