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
  type NonAttribute,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionRun } from '.';
import { type Status } from './status.ts';

/** These are all the attributes in the ActionRunAttempt model */
export type ActionRunAttemptAttributes = InferAttributes<ActionRunAttempt>;

/** Some attributes are optional in `ActionRunAttempt.build` and `ActionRunAttempt.create` calls */
export type ActionRunAttemptCreationAttributes = InferCreationAttributes<ActionRunAttempt>;

/**
 * ActionRunAttempt represents a job of a run
 */
class ActionRunAttempt extends BaseModel<ActionRunAttemptAttributes, ActionRunAttemptCreationAttributes> {
  declare runId: number;
  declare repositoryId: number;
  declare attempt: number;
  declare triggerUserId: number;
  declare concurrencyGroup: string;
  declare concurrencyCancel: boolean;
  declare status: Status;
  declare startedAt: Date | null;
  declare stoppedAt: Date | null;

  declare Run?: NonAttribute<ActionRun>;

  static associate({ ActionRun }: Models) {
    this.belongsTo(ActionRun, { foreignKey: 'runId' });
  }

  declare static associations: {
    Run: Association<ActionRunAttempt, ActionRun>;
  };

  declare getActionRun: BelongsToGetAssociationMixin<ActionRun>;

  declare setActionRun: BelongsToSetAssociationMixin<ActionRun, bigint>;

  declare createActionRun: BelongsToCreateAssociationMixin<ActionRun>;
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
      type: DataTypes.STRING(50),
      allowNull: false,
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

export default ActionRunAttempt;
