/**
 * ActionRunnerToken represents runner tokens
 *
 * sobird<i@sobird.me> at 2024/11/16 20:02:24 created.
 */

import { randomBytes } from 'node:crypto';

import { DataTypes, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type ActionRunnerTokenAttributes = InferAttributes<ActionRunnerToken>;
export type ActionRunnerTokenCreationAttributes = InferCreationAttributes<ActionRunnerToken>;

export class ActionRunnerToken extends BaseModel<ActionRunnerTokenAttributes, ActionRunnerTokenCreationAttributes> {
  declare token: CreationOptional<string>;
  declare ownerId: number;
  declare repositoryId: number;
  /**
   * true means it can be used
   */
  declare enabled: CreationOptional<boolean>;

  // creates a new active runner token and invalidate all old tokens
  public static async createRunnerTokenWithValue(ownerId: number, repositoryId: number, token: string) {
    if (ownerId !== 0 && repositoryId !== 0) {
      ownerId = 0;
    }

    return await sequelize.transaction(async (transaction) => {
      await this.update({ enabled: false }, { where: { ownerId, repositoryId }, transaction });
      const runnerToken = await this.create(
        {
          ownerId,
          repositoryId,
          token,
        },
        { transaction },
      );
      return runnerToken;
    });
  }

  public static async createRunnerToken(ownerId: number, repoId: number) {
    const token = randomBytes(20).toString('hex');
    return await this.createRunnerTokenWithValue(ownerId, repoId, token);
  }

  /**
   * returns the latest runner token
   */
  public static async findLatestOne(ownerId: number, repositoryId: number) {
    if (ownerId !== 0 && repositoryId !== 0) {
      ownerId = 0;
    }

    const runnerToken = await this.findOne({
      where: {
        ownerId,
        repositoryId,
      },
      order: [['id', 'DESC']],
    });

    if (!runnerToken) {
      throw Error('runner token does not exist');
    }

    return runnerToken;
  }
}

ActionRunnerToken.init(
  {
    token: {
      type: DataTypes.STRING(40),
      defaultValue: () => {
        return randomBytes(20).toString('hex');
      },
      allowNull: false,
      unique: true,
      comment: 'runner token',
    },
    ownerId: {
      type: DataTypes.INTEGER,
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.INTEGER,
      comment: 'repository id',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    indexes: [{ fields: ['owner_id'] }, { fields: ['repo_id'] }],
  },
);
