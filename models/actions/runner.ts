/**
 * Actions Runner Model
 *
 * sobird<i@sobird.me> at 2024/11/16 23:31:19 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes, CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionsRunner model */
export type ActionsRunnerAttributes = InferAttributes<ActionsRunner>;

/** Some attributes are optional in `ActionsRunner.build` and `ActionsRunner.create` calls */
export type ActionsRunnerCreationAttributes = InferCreationAttributes<ActionsRunner>;

class ActionsRunner extends BaseModel<ActionsRunnerAttributes, ActionsRunnerCreationAttributes> {
  declare uuid: CreationOptional<string>;

  declare name: string;

  declare version: string;

  declare ownerId: number;

  declare repositoryId: number;

  declare description: string;

  declare base: number;

  declare repoRange: string;

  declare token: string;

  declare tokenHash: string;

  declare tokenSalt: string;

  declare lastOnline: Date;

  declare lastActive: Date;

  declare labels: string;

  // static associate({ User }) {
  //   this.belongsTo(User, { onDelete: 'cascade' });
  // }
}

ActionsRunner.init(
  {
    uuid: {
      type: DataTypes.CHAR(36),
      unique: true,
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
      type: DataTypes.STRING,
    },
    tokenHash: {
      type: DataTypes.STRING,
      unique: true,
    },
    tokenSalt: {
      type: DataTypes.STRING,
    },
    lastOnline: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    lastActive: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    labels: {
      type: DataTypes.TEXT,
      comment: 'Store labels defined in state file (default: .runner file) of `runner`',
    },
  },
  {
    sequelize,
    modelName: 'ActionsRunner',
  },
);

// ActionsRunner.beforeCreate((model) => {

// });

export default ActionsRunner;
