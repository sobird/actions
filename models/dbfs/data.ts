/**
 * meta.ts
 *
 * sobird<i@sobird.me> at 2024/11/23 23:28:48 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes, CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the DbfsData model */
export type DbfsDataAttributes = InferAttributes<DbfsData>;

/** Some attributes are optional in `DbfsData.build` and `DbfsData.create` calls */
export type DbfsDataCreationAttributes = InferCreationAttributes<DbfsData>;

class DbfsData extends BaseModel<DbfsDataAttributes, DbfsDataCreationAttributes> {
  declare id: CreationOptional<number>;

  declare revision: CreationOptional<number>;

  declare metaId: number;

  declare blobOffset: number;

  declare blobSize: CreationOptional<number>;

  declare blobData: Buffer;
}

DbfsData.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    revision: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    metaId: {
      type: DataTypes.INTEGER,
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
    modelName: 'DbfsData',
  },
);

export default DbfsData;
