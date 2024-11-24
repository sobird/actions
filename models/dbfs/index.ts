import {
  DataTypes,
  type ModelAttributes,
} from 'sequelize';

export const DataModelAttributes: ModelAttributes = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  revision: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  metaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  blobOffset: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  blobSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  blobData: {
    type: DataTypes.BLOB,
    allowNull: false,
  },
};
