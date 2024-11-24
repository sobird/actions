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

/** These are all the attributes in the DbfsMeta model */
export type DbfsMetaAttributes = InferAttributes<DbfsMeta>;

/** Some attributes are optional in `DbfsMeta.build` and `DbfsMeta.create` calls */
export type DbfsMetaCreationAttributes = InferCreationAttributes<DbfsMeta>;

class DbfsMeta extends BaseModel<DbfsMetaAttributes, DbfsMetaCreationAttributes> {
  declare id: CreationOptional<number>;

  declare fullPath: string;

  declare blockSize: number;

  declare fileSize: CreationOptional<number>;
}

DbfsMeta.init(
  {
    id: {
      type: DataTypes.INTEGER,
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
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'DbfsMeta',
  },
);

export default DbfsMeta;
