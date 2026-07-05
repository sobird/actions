/**
 * Actions Runner Token
 *
 * sobird<i@sobird.me> at 2024/11/16 20:02:24 created.
 */

import { randomBytes } from 'node:crypto';

import { DataTypes, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

/** These are all the attributes in the ActionRunnerToken model */
export type ActionRunnerTokenAttributes = InferAttributes<ActionRunnerToken>;

/** Some attributes are optional in `ActionRunnerToken.build` and `ActionRunnerToken.create` calls */
export type ActionRunnerTokenCreationAttributes = InferCreationAttributes<ActionRunnerToken>;

class ActionRunnerToken extends BaseModel<ActionRunnerTokenAttributes, ActionRunnerTokenCreationAttributes> {
  declare token: CreationOptional<string>;

  declare ownerId: number;

  declare repositoryId: number;

  declare enabled: CreationOptional<boolean>;

  // creates a new active runner token and invalidate all old tokens
  public static async createForScope(ownerId: number, repositoryId: number) {
    const runnerToken = this.build({
      ownerId,
      repositoryId,
    });

    await sequelize.transaction(async () => {
      await this.update({ enabled: false }, { where: { ownerId, repositoryId } });
      await runnerToken.save();
    });

    return runnerToken;
  }

  /**
   * returns the latest runner registration token
   */
  public static async findLatestByScope(ownerId: number, repositoryId: number) {
    const runnerToken = await this.findOne({
      where: {
        ownerId,
        repositoryId,
      },
      order: [['id', 'DESC']],
    });

    if (!runnerToken) {
      throw Error('runner registration token does not exist');
    }

    return runnerToken;
  }
}

ActionRunnerToken.init(
  {
    token: {
      type: DataTypes.STRING,
      defaultValue: () => {
        return randomBytes(40).toString('hex');
      },
      allowNull: false,
      unique: true,
      comment: 'actions runner registration token',
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
      comment: 'true means it can be used',
    },
  },
  {
    sequelize,
  },
);

export default ActionRunnerToken;
