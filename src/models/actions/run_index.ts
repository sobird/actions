/**
 * Action Run Index Counter
 *
 * The run index is handed out from a dedicated counter table instead of a
 * "max() + 1" read, which two concurrent runs could resolve to the same value
 * and collide on the unique index.
 *
 * sobird<i@sobird.me> at 2026/09/14 created.
 */

import { DataTypes, type InferAttributes, type InferCreationAttributes, type Transaction } from 'sequelize';

import { sequelize, BaseModel, getNextResourceIndex } from '@/lib/sequelize';

export type ActionRunIndexAttributes = InferAttributes<ActionRunIndex>;
export type ActionRunIndexCreationAttributes = InferCreationAttributes<ActionRunIndex>;

/** Counter behind `ActionRun.index`, keyed by repository. */
export class ActionRunIndex extends BaseModel<ActionRunIndexAttributes, ActionRunIndexCreationAttributes> {
  declare groupId: number;
  declare maxIndex: number;

  public static getNext(repositoryId: number, transaction: Transaction) {
    return getNextResourceIndex(this, repositoryId, transaction);
  }
}

ActionRunIndex.init(
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
