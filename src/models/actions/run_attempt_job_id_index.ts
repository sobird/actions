/**
 * Action Run Attempt Job ID Counter
 *
 * The per-run job index is handed out from a dedicated counter table instead of a
 * "max() + 1" read, which two concurrent runs could resolve to the same value and
 * collide on the unique index.
 *
 * sobird<i@sobird.me> at 2026/09/14 created.
 */

import { DataTypes, type InferAttributes, type InferCreationAttributes, type Transaction } from 'sequelize';

import { sequelize, BaseModel, getNextResourceIndex } from '@/lib/sequelize';

export type ActionRunAttemptJobIdIndexAttributes = InferAttributes<ActionRunAttemptJobIdIndex>;
export type ActionRunAttemptJobIdIndexCreationAttributes = InferCreationAttributes<ActionRunAttemptJobIdIndex>;

/** Counter behind `ActionRunJob.attemptJobId`, keyed by run. */
export class ActionRunAttemptJobIdIndex extends BaseModel<
  ActionRunAttemptJobIdIndexAttributes,
  ActionRunAttemptJobIdIndexCreationAttributes
> {
  declare groupId: number;
  declare maxIndex: number;

  public static getNext(runId: number, transaction: Transaction) {
    return getNextResourceIndex(this, runId, transaction);
  }
}

ActionRunAttemptJobIdIndex.init(
  {
    groupId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      comment: 'the scope the index is allocated in',
    },
    maxIndex: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1,
      comment: 'the last index handed out',
    },
  },
  {
    sequelize,
    // The counter rows carry no timestamps, and the allocation is a raw upsert
    // that would otherwise have to invent them.
    timestamps: false,
  },
);
