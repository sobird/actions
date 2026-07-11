/**
 * Actions Task Version
 *
 * sobird<i@sobird.me> at 2024/11/25 14:57:01 created.
 */

import {
  DataTypes,
  type Transaction,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type ActionTaskVersionAttributes = InferAttributes<ActionTaskVersion>;
export type ActionTaskVersionCreationAttributes = InferCreationAttributes<ActionTaskVersion>;

// If both ownerID and repoID is zero, its scope is global.
// If ownerID is not zero and repoID is zero, its scope is org (there is no user-level runner currrently).
// If ownerID is zero and repoID is not zero, its scope is repo.
export class ActionTaskVersion extends BaseModel<ActionTaskVersionAttributes, ActionTaskVersionCreationAttributes> {
  declare ownerId: number;
  declare repositoryId: number;
  declare version: CreationOptional<bigint>;

  public static async findOneVersionByScope(ownerId: number, repositoryId: number) {
    const taskVersion = await this.findOne({
      where: {
        ownerId,
        repositoryId,
      },
    });

    return taskVersion ? taskVersion.version : 0n;
  }

  public static async increaseVersionByScope(ownerId: number, repositoryId: number, transaction?: Transaction) {
    const [, affectedCount] = await this.increment('version', {
      by: 1,
      where: {
        ownerId,
        repositoryId,
      },
      transaction,
    });

    if (affectedCount === 0) {
      await this.create(
        {
          ownerId,
          repositoryId,
        },
        { transaction },
      );
    }
  }

  public static async increaseVersion(ownerId: number, repositoryId: number) {
    const transaction = await sequelize.transaction();

    // increase global
    await this.increaseVersionByScope(0, 0, transaction);

    // increase owner
    await this.increaseVersionByScope(ownerId, 0, transaction);

    // increase repository
    await this.increaseVersionByScope(0, repositoryId, transaction);

    return transaction.commit();
  }
}

ActionTaskVersion.init(
  {
    ownerId: {
      type: DataTypes.BIGINT,
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      comment: 'repository id',
    },
    version: {
      type: DataTypes.BIGINT,
      defaultValue: 1,
      comment: 'task version',
    },
  },
  {
    sequelize,
    indexes: [
      {
        name: 'owner_repo',
        unique: true,
        fields: ['owner_id', 'repository_id'],
      },
      {
        name: 'idx_repo',
        fields: ['repository_id'],
      },
    ],
  },
);
