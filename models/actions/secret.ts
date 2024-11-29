/**
 * Actions Secret Model
 *
 * sobird<i@sobird.me> at 2024/11/28 10:14:19 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';
import { secret } from '@/utils';

import type Task from './task';

/** These are all the attributes in the ActionsSecret model */
export type ActionsSecretAttributes = InferAttributes<ActionsSecret>;

/** Some attributes are optional in `ActionsSecret.build` and `ActionsSecret.create` calls */
export type ActionsSecretCreationAttributes = InferCreationAttributes<ActionsSecret>;

class ActionsSecret extends BaseModel<ActionsSecretAttributes, ActionsSecretCreationAttributes> {
  declare ownerId: number;

  declare repositoryId: number;

  declare label: string;

  declare value: string;

  // static associate({ User }) {
  //   this.belongsTo(User, { onDelete: 'cascade' });
  // }

  public static async SecretsForTask(task: Task) {
    const secrets: Record<string, string> = {};

    if (task.Job?.Run?.isForkPullRequest && task.Job.Run.triggerEvent !== 'pull_request_target') {
      // ignore secrets for fork pull request, except GITHUB_TOKEN which are automatically generated.
      // for the tasks triggered by pull_request_target event, they could access the secrets because they will run in the context of the base branch
      // see the documentation: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target
      return secrets;
    }
    //
    const ownerSecrets = await this.findAll({ where: { ownerId: task.ownerId } });

    const repositorySecrets = await this.findAll({ where: { repositoryId: task.repositoryId } });

    [...ownerSecrets, ...repositorySecrets].forEach((row) => {
      secrets[row.label] = row.value;
    });

    return secrets;
  }
}

ActionsSecret.init(
  {
    ownerId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      comment: 'owner id',
    },
    repositoryId: {
      type: DataTypes.INTEGER,
      comment: 'repository id',
    },
    label: {
      type: DataTypes.CHAR,
      unique: true,
      allowNull: false,
      comment: 'actions secret label',
      set(value: string) {
        this.setDataValue('value', value.toUpperCase());
      },
    },
    value: {
      type: DataTypes.TEXT,
      comment: 'actions secret value',
      set(value: string) {
        this.setDataValue('value', secret.encrypt(this.getDataValue('label'), value));
      },
      get() {
        return secret.encrypt(this.getDataValue('label'), this.getDataValue('value'));
      },
    },
  },
  {
    sequelize,
    modelName: 'ActionsSecret',
  },
);

export default ActionsSecret;
