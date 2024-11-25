/**
 * Actions Task Version
 *
 * sobird<i@sobird.me> at 2024/11/25 14:57:01 created.
 */

import {
  DataTypes,
  type InferAttributes, InferCreationAttributes, CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionsTaskVersion model */
export type ActionsTaskVersionAttributes = InferAttributes<ActionsTaskVersion>;

/** Some attributes are optional in `ActionsTaskVersion.build` and `ActionsTaskVersion.create` calls */
export type ActionsTaskVersionCreationAttributes = InferCreationAttributes<ActionsTaskVersion>;

class ActionsTaskVersion extends BaseModel<ActionsTaskVersionAttributes, ActionsTaskVersionCreationAttributes> {
  declare token: CreationOptional<string>;

  declare ownerId: number;

  declare repositoryId: number;

  declare version: CreationOptional<number>;

  public static async findOneVersionByScope(ownerId: number, repositoryId: number) {
    const taskVersion = await this.findOne({
      where: {
        ownerId,
        repositoryId,
      },
    });
    return taskVersion?.version || 0;
  }

  public static async increaseVersionByScope(ownerId: number, repositoryId: number) {
    const [, affectedCount] = await this.increment('version', {
      by: 1,
      where: {
        ownerId,
        repositoryId,
      },
    });

    if (affectedCount === 0) {
      await this.create({
        ownerId,
        repositoryId,
      });
    }
  }

  public static async increaseVersion(ownerId: number, repositoryId: number) {
    const t = await sequelize.transaction();

    // increase global
    await this.increaseVersionByScope(0, 0);

    // increase owner
    await this.increaseVersionByScope(ownerId, 0);

    // increase repository
    await this.increaseVersionByScope(0, repositoryId);

    return t.commit();
  }
}

ActionsTaskVersion.init(
  {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'actions runner token',
    },
    ownerId: {
      type: DataTypes.INTEGER,
      unique: 'owner_repo',
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.INTEGER,
      unique: 'owner_repo',
      comment: 'repository id',
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'task version',
    },
  },
  {
    sequelize,
    modelName: 'ActionsTaskVersion',
  },
);

// ActionsTaskVersion.beforeCreate((model) => {

// });

export default ActionsTaskVersion;
