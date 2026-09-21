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
  type CreationAttributes,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type ActionTaskVersionCreationAttributes = CreationAttributes<ActionTaskVersion>;

// If both ownerID and repoID is zero, its scope is global.
// If ownerID is not zero and repoID is zero, its scope is org (there is no user-level runner currrently).
// If ownerID is zero and repoID is not zero, its scope is repo.
export class ActionTaskVersion extends BaseModel<
  InferAttributes<ActionTaskVersion>,
  InferCreationAttributes<ActionTaskVersion>
> {
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

    // Coerce to bigint: the column reads back as a number/string depending on the
    // dialect, while callers compare it against the int64 tasksVersion.
    return taskVersion ? BigInt(taskVersion.version) : 0n;
  }

  private static async increaseVersionByScope(ownerId: number, repositoryId: number, transaction?: Transaction) {
    const where = { ownerId, repositoryId };
    const existing = await this.findOne({ where, transaction });

    if (existing) {
      await this.increment('version', { by: 1, where, transaction });
      return;
    }

    await this.create({ ownerId, repositoryId }, { transaction });
  }

  public static async increaseVersion(ownerId: number, repositoryId: number, transaction?: Transaction) {
    const increase = async (tx: Transaction) => {
      // increase global
      await this.increaseVersionByScope(0, 0, tx);

      // increase owner
      if (ownerId > 0) {
        await this.increaseVersionByScope(ownerId, 0, tx);
      }

      // increase repository
      if (repositoryId > 0) {
        await this.increaseVersionByScope(0, repositoryId, tx);
      }
    };

    // Join the caller's transaction when there is one. Opening a second one here
    // deadlocks: sqlite gives each transaction its own connection, so the new
    // transaction blocks on the write lock the caller already holds while the
    // caller waits for this call to return. Upstream's db.WithTx reuses the
    // session already in ctx for the same reason.
    if (transaction) {
      return increase(transaction);
    }

    await sequelize.transaction(increase);
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
