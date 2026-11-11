/**
 * Dbfs Meta Model
 *
 * sobird<i@sobird.me> at 2024/11/23 23:28:48 created.
 */

import {
  DataTypes,
  type Association,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
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
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { DbfsData } from './data';

export type DbfsMetaCreationAttributes = CreationAttributes<DbfsMeta>;

/** Metadata of one file stored in the database; its bytes live in `dbfs_data` blocks. */
export class DbfsMeta extends BaseModel<InferAttributes<DbfsMeta>, InferCreationAttributes<DbfsMeta>> {
  declare id: CreationOptional<number>;
  declare fullPath: string;
  declare blockSize: number;
  declare fileSize: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare chunks?: NonAttribute<DbfsData[]>;

  declare static associations: {
    chunks: Association<DbfsMeta, DbfsData>;
  };

  // hasMany DbfsData, alias 'chunks'; registered in ./index next to the reverse side
  declare getChunks: HasManyGetAssociationsMixin<DbfsData>;
  declare setChunks: HasManySetAssociationsMixin<DbfsData, number>;
  declare addChunk: HasManyAddAssociationMixin<DbfsData, number>;
  declare addChunks: HasManyAddAssociationsMixin<DbfsData, number>;
  declare removeChunk: HasManyRemoveAssociationMixin<DbfsData, number>;
  declare removeChunks: HasManyRemoveAssociationsMixin<DbfsData, number>;
  declare hasChunk: HasManyHasAssociationMixin<DbfsData, number>;
  declare hasChunks: HasManyHasAssociationsMixin<DbfsData, number>;
  declare createChunk: HasManyCreateAssociationMixin<DbfsData>;
  declare countChunks: HasManyCountAssociationsMixin;
}

DbfsMeta.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    fullPath: {
      type: DataTypes.CHAR(500),
      unique: true,
      allowNull: false,
    },
    blockSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'DbfsMeta',
  },
);
