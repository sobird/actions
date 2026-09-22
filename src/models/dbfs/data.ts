/**
 * Dbfs Data Model
 *
 * sobird<i@sobird.me> at 2024/11/23 23:28:48 created.
 */

import {
  DataTypes,
  type InferAttributes,
  InferCreationAttributes,
  CreationAttributes,
  CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type DbfsDataCreationAttributes = CreationAttributes<DbfsData>;

export class DbfsData extends BaseModel<InferAttributes<DbfsData>, InferCreationAttributes<DbfsData>> {
  declare id: CreationOptional<number>;
  declare metaId: number;
  declare revision: CreationOptional<number>;
  declare blobOffset: number;
  declare blobSize: CreationOptional<number>;
  declare blobData: Buffer;
}

DbfsData.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    metaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    revision: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    blobOffset: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    blobSize: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    blobData: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
  },
  {
    sequelize,
  },
);
