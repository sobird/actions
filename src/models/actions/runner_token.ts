/**
 * ActionRunnerToken represents runner tokens
 *
 * sobird<i@sobird.me> at 2024/11/16 20:02:24 created.
 */

import { randomBytes } from 'node:crypto';

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type CreationAttributes,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

export type ActionRunnerTokenCreationAttributes = CreationAttributes<ActionRunnerToken>;

export class ActionRunnerToken extends BaseModel<
  InferAttributes<ActionRunnerToken>,
  InferCreationAttributes<ActionRunnerToken>
> {
  declare token: CreationOptional<string>;
  declare ownerId: number;
  declare repositoryId: number;
  declare enabled: CreationOptional<boolean>;

  // creates a new active runner token and invalidate all old tokens
  public static async rotate(ownerId: number, repositoryId: number, token?: string) {
    if (ownerId !== 0 && repositoryId !== 0) {
      ownerId = 0;
    }

    return await sequelize.transaction(async (transaction) => {
      await this.update({ enabled: false }, { where: { ownerId, repositoryId, enabled: true }, transaction });
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
        enabled: true,
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
      defaultValue: () => randomBytes(30).toString('base64url'),
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
    indexes: [{ fields: ['owner_id'] }, { fields: ['repository_id'] }],
  },
);
