/**
 * Dbfs Data Model
 *
 * sobird<i@sobird.me> at 2024/11/23 23:28:48 created.
 */

import {
  DataTypes,
  type Association,
  CreationAttributes,
  CreationOptional,
  type NonAttribute,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { DbfsMeta } from './meta';

export type DbfsDataCreationAttributes = CreationAttributes<DbfsData>;

/** One block of a file stored in `dbfs_meta`, identified by its offset in that file. */
export class DbfsData extends BaseModel<DbfsData> {
  declare id: CreationOptional<number>;
  declare metaId: number;
  declare revision: CreationOptional<number>;
  declare blobOffset: number;
  declare blobSize: CreationOptional<number>;
  declare blobData: Buffer;

  declare meta?: NonAttribute<DbfsMeta>;

  declare static associations: {
    meta: Association<DbfsData, DbfsMeta>;
  };

  // belongsTo DbfsMeta, alias 'meta'; registered in ./index next to the reverse side
  declare getMeta: BelongsToGetAssociationMixin<DbfsMeta>;
  declare setMeta: BelongsToSetAssociationMixin<DbfsMeta, number>;
  declare createMeta: BelongsToCreateAssociationMixin<DbfsMeta>;
}

DbfsData.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    metaId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    revision: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    blobOffset: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    blobSize: {
      type: DataTypes.BIGINT,
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
    indexes: [
      {
        // Serves the (meta_id, blob_offset) lookup every read and write does.
        name: 'meta_offset',
        fields: ['meta_id', 'blob_offset'],
      },
    ],
  },
);
