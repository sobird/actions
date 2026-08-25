/**
 * Repository Model
 *
 * sobird<i@sobird.me> at 2024/11/26 21:23:24 created.
 */

import { DataTypes, type InferAttributes, type InferCreationAttributes, type CreationAttributes } from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type RepositoryCreationAttributes = CreationAttributes<Repository>;

class Repository extends BaseModel<InferAttributes<Repository>, InferCreationAttributes<Repository>> {
  declare ownerId: bigint;

  declare name: string;

  declare description: string;

  declare website: number;

  declare originalURL: string;

  declare defaultBranch: string;

  declare defaultWikiBranch: string;

  declare topics: string[];

  // static associate({ User }) {
  //   this.belongsTo(User, { onDelete: 'cascade' });
  // }
}

Repository.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    website: {
      type: DataTypes.CHAR(2048),
    },
    originalURL: {
      type: DataTypes.STRING,
    },
    defaultBranch: {
      type: DataTypes.STRING,
    },
    defaultWikiBranch: {
      type: DataTypes.STRING,
    },
    topics: {
      type: DataTypes.JSON,
    },
  },
  {
    sequelize,
    modelName: 'Repository',
  },
);

// Repository.beforeCreate((model) => {

// });

export default Repository;
