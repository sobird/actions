/**
 * Actions Runner Model
 *
 * sobird<i@sobird.me> at 2024/11/16 23:31:19 created.
 */

import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
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
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionsTask } from '.';

/** These are all the attributes in the ActionsRunner model */
export type ActionsRunnerAttributes = InferAttributes<ActionsRunner>;

/** Some attributes are optional in `ActionsRunner.build` and `ActionsRunner.create` calls */
export type ActionsRunnerCreationAttributes = InferCreationAttributes<ActionsRunner>;

export type ActionsTaskPrimaryKey = ActionsTask['id'];

class ActionsRunner extends BaseModel<ActionsRunnerAttributes, ActionsRunnerCreationAttributes> {
  declare uuid: CreationOptional<string>;

  declare name: string;

  declare version: string;

  declare ownerId: number;

  declare repositoryId: number;

  declare description: CreationOptional<string>;

  declare base: CreationOptional<number>;

  declare repoRange: CreationOptional<string>;

  declare token: CreationOptional<string>;

  declare tokenHash: CreationOptional<string>;

  declare tokenSalt: CreationOptional<string>;

  declare lastOnline: CreationOptional<Date>;

  declare lastActive: CreationOptional<Date>;

  declare labels: string[];

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

  static associate({ ActionsTask }: Models) {
    this.hasMany(ActionsTask, { foreignKey: 'runnerId' });
  }

  public verifyToken(token: string) {
    if (!token) {
      return false;
    }
    const tokenHash = ActionsRunner.hashToken(token, this.tokenSalt);
    return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(this.tokenHash));
  }

  public static hashToken(token: string, salt: string) {
    return pbkdf2Sync(token, salt, 100000, 64, 'sha512').toString('hex');
  }
}

ActionsRunner.init(
  {
    uuid: {
      type: DataTypes.UUIDV4,
      unique: true,
      defaultValue: DataTypes.UUIDV4(),
    },
    name: {
      type: DataTypes.STRING(255),
    },
    version: {
      type: DataTypes.STRING(64),
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    base: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    repoRange: {
      type: DataTypes.STRING,
    },
    token: {
      type: DataTypes.VIRTUAL,
      defaultValue: () => { return randomBytes(20).toString('hex'); },
      unique: true,
      allowNull: false,
      comment: 'runner token',
    },
    tokenSalt: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      defaultValue: () => { return randomBytes(16).toString('hex'); },
      comment: 'token salt',
    },
    tokenHash: {
      type: DataTypes.STRING,
      comment: 'token hash',
    },
    lastOnline: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.DATE(),
    },
    lastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.DATE(),
    },
    labels: {
      type: DataTypes.JSON,
      comment: 'Store labels defined in state file (default: .runner file) of `runner`',
    },
  },
  {
    sequelize,
    modelName: 'ActionsRunner',
  },
);

ActionsRunner.beforeCreate((model) => {
  // eslint-disable-next-line no-param-reassign
  model.tokenHash = ActionsRunner.hashToken(model.token, model.tokenSalt);
});

export default ActionsRunner;
