/**
 * meta.ts
 *
 * sobird<i@sobird.me> at 2024/11/23 23:28:48 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type DbfsMetaCreationAttributes = CreationAttributes<DbfsMeta>;

export class DbfsMeta extends BaseModel<InferAttributes<DbfsMeta>, InferCreationAttributes<DbfsMeta>> {
  declare fullPath: string;
  declare blockSize: number;
  declare fileSize: CreationOptional<number>;
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
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
  },
);
