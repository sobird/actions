/**
 * ActionRunner represents runner machines
 *
 * sobird<i@sobird.me> at 2024/11/16 23:31:19 created.
 */

import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type CreationOptional,
  type Association,
  type NonAttribute,
  type HasManyGetAssociationsMixin,
  type HasManySetAssociationsMixin,
  type HasManyAddAssociationMixin,
  type HasManyAddAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type HasManyRemoveAssociationsMixin,
  type HasManyHasAssociationMixin,
  type HasManyHasAssociationsMixin,
  type HasManyCreateAssociationMixin,
  type HasManyCountAssociationsMixin,
} from 'sequelize';

import { RunnerStatus } from '@/gen/runner/v1/messages_pb';
import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionTask } from '.';

export type ActionRunnerCreationAttributes = CreationAttributes<ActionRunner>;

const RUNNER_OFFLINE_TIME = 60 * 1000;
const RUNNER_IDLE_TIME = 10 * 1000;

/**
 *  ActionRunner represents runner machines
 *
 * It can be:
 *  1. global runner, OwnerID is 0 and RepoID is 0
 *  2. org/user level runner, OwnerID is org/user ID and RepoID is 0
 *  3. repo level runner, OwnerID is 0 and RepoID is repo ID
 *
 * Please note that it's not acceptable to have both OwnerID and RepoID to be non-zero,
 * or it will be complicated to find runners belonging to a specific owner.
 * For example, conditions like `OwnerID = 1` will also return runner {OwnerID: 1, RepoID: 1},
 * but it's a repo level runner, not an org/user level runner.
 * To avoid this, make it clear with {OwnerID: 0, RepoID: 1} for repo level runners.
 */
export class ActionRunner extends BaseModel<InferAttributes<ActionRunner>, InferCreationAttributes<ActionRunner>> {
  declare uuid: CreationOptional<string>;
  declare name: string;
  declare version: string;
  declare ownerId: number;
  declare repositoryId: number;
  declare description: CreationOptional<string>;
  declare base: CreationOptional<number>;
  declare repoRange: CreationOptional<string>;
  declare token: CreationOptional<string>;
  declare tokenHash: CreationOptional<string>;
  declare tokenSalt: CreationOptional<string>;
  declare lastOnline: CreationOptional<Date>;
  declare lastActive: CreationOptional<Date>;
  declare ephemeral: CreationOptional<boolean>;
  declare isDisabled: CreationOptional<boolean>;
  declare isOnline: CreationOptional<boolean>;
  declare labels: string[];
  declare status: CreationOptional<RunnerStatus>;
  declare hasCancellingSupport: CreationOptional<boolean>;

  public verifyToken(token: string) {
    if (!token) {
      return false;
    }
    const tokenHash = ActionRunner.hashToken(token, this.tokenSalt);
    return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(this.tokenHash));
  }

  public static hashToken(token: string, salt: string) {
    return pbkdf2Sync(Buffer.from(token), Buffer.from(salt), 10000, 50, 'sha256').toString('hex');
  }

  /**
   * checks whether the runner's labels can match a job's "runs-on"
   */
  public canMatchLabels(jobRunsOn: string[]): boolean {
    if (!this.labels || !Array.isArray(this.labels)) return false;
    const runnerLabelSet = new Set(this.labels);
    return jobRunsOn.every((label) => runnerLabelSet.has(label));
  }

  static associate({ ActionTask }: Models) {
    this.hasMany(ActionTask, { foreignKey: 'runnerId' });
  }

  declare static associations: {
    ActionTasks: Association<ActionRunner, ActionTask>;
  };

  declare Tasks?: NonAttribute<ActionTask[]>;

  declare getActionTasks: HasManyGetAssociationsMixin<ActionTask>;
  declare countActionTasks: HasManyCountAssociationsMixin;
  declare hasActionTask: HasManyHasAssociationMixin<ActionTask, bigint>;
  declare hasActionTasks: HasManyHasAssociationsMixin<ActionTask, bigint>;
  declare setActionTasks: HasManySetAssociationsMixin<ActionTask, bigint>;
  declare addActionTask: HasManyAddAssociationMixin<ActionTask, bigint>;
  declare addActionTasks: HasManyAddAssociationsMixin<ActionTask, bigint>;
  declare removeActionTask: HasManyRemoveAssociationMixin<ActionTask, bigint>;
  declare removeActionTasks: HasManyRemoveAssociationsMixin<ActionTask, bigint>;
  declare createActionTask: HasManyCreateAssociationMixin<ActionTask>;
}

ActionRunner.init(
  {
    uuid: {
      type: DataTypes.UUIDV4,
      unique: true,
      defaultValue: DataTypes.UUIDV4(),
    },
    name: {
      type: DataTypes.STRING(255),
    },
    version: {
      type: DataTypes.STRING(64),
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    base: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    repoRange: {
      type: DataTypes.STRING,
    },
    token: {
      type: DataTypes.VIRTUAL,
      defaultValue: () => {
        return randomBytes(20).toString('hex');
      },
      allowNull: false,
      comment: 'runner token',
    },
    tokenSalt: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: () => randomBytes(6).toString('base64url'),
      comment: 'token salt',
    },
    tokenHash: {
      type: DataTypes.STRING,
      unique: true,
      comment: 'token hash',
    },
    lastOnline: {
      type: DataTypes.DATE,
    },
    lastActive: {
      type: DataTypes.DATE,
    },
    labels: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Store labels defined in state file (default: .runner file) of `runner`',
    },
    ephemeral: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isDisabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    hasCancellingSupport: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.VIRTUAL,
      get() {
        const lastOnline = this.getDataValue('lastOnline');
        const lastActive = this.getDataValue('lastActive');

        if (!lastOnline) {
          return RunnerStatus.OFFLINE;
        }

        const now = Date.now();

        if (now - lastOnline.getTime() > RUNNER_OFFLINE_TIME) {
          return RunnerStatus.OFFLINE;
        }

        if (!lastActive) {
          return RunnerStatus.IDLE;
        }
        if (now - lastActive.getTime() > RUNNER_IDLE_TIME) {
          return RunnerStatus.IDLE;
        }
        return RunnerStatus.ACTIVE;
      },
    },
    isOnline: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.status === RunnerStatus.IDLE || this.status === RunnerStatus.ACTIVE;
      },
    },
  },
  {
    sequelize,
  },
);

ActionRunner.beforeCreate((model) => {
  model.tokenHash = ActionRunner.hashToken(model.token, model.tokenSalt);
});
