/**
 * ActionRunAttempt represents a single execution attempt of an ActionRun.
 *
 * sobird<i@sobird.me> at 2026/07/06 4:09:59 created.
 */

import {
  DataTypes,
  Association,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type NonAttribute,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionRun } from '.';
import { Status } from './status';

export type ActionRunAttemptCreationAttributes = CreationAttributes<ActionRunAttempt>;

/**
 * ActionRunAttempt represents a job of a run
 */
export class ActionRunAttempt extends BaseModel<
  InferAttributes<ActionRunAttempt>,
  InferCreationAttributes<ActionRunAttempt>
> {
  declare runId: number;
  declare repositoryId: number;
  declare attempt: number;

  declare triggerUserId: number;

  declare concurrencyGroup: string;
  declare concurrencyCancel: boolean;

  declare status: Status;
  declare startedAt: Date | null;
  declare stoppedAt: Date | null;

  declare run?: NonAttribute<ActionRun>;

  static associate({ ActionRun }: Models) {
    this.belongsTo(ActionRun, { as: 'run', foreignKey: 'runId' });
  }

  declare static associations: {
    run: Association<ActionRunAttempt, ActionRun>;
  };

  declare getRun: BelongsToGetAssociationMixin<ActionRun>;
  declare setRun: BelongsToSetAssociationMixin<ActionRun, bigint>;
  declare createRun: BelongsToCreateAssociationMixin<ActionRun>;
}

ActionRunAttempt.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    runId: {
      type: DataTypes.BIGINT,
    },
    triggerUserId: {
      type: DataTypes.BIGINT,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    attempt: {
      type: DataTypes.BIGINT,
    },
    concurrencyGroup: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    concurrencyCancel: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM,
      values: Status.names(),
      allowNull: false,
      get() {
        return Status.from(this.getDataValue('status') as unknown as string);
      },
      set(value: Status) {
        this.setDataValue('status', value.toString() as unknown as Status);
      },
      validate: {
        isIn: {
          args: [Status.names()],
          msg: `Must be in ${Status.names()}`,
        },
      },
    },
    startedAt: DataTypes.DATE,
    stoppedAt: DataTypes.DATE,
  },
  {
    sequelize,
    indexes: [
      {
        name: 'run_attempt',
        unique: true,
        fields: ['run_id', 'attempt'],
      },
      {
        name: 'repo_concurrency_status',
        fields: ['repository_id', 'concurrency_group', 'status'],
      },
    ],
  },
);
