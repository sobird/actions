/**
 * Repository Model
 *
 * sobird<i@sobird.me> at 2024/11/26 21:23:24 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the Repository model */
export type RepositoryAttributes = InferAttributes<Repository>;

/** Some attributes are optional in `Repository.build` and `Repository.create` calls */
export type RepositoryCreationAttributes = InferCreationAttributes<Repository>;

class Repository extends BaseModel<RepositoryAttributes, RepositoryCreationAttributes> {
  declare ownerId: number;

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
