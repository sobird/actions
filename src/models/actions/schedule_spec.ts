/**
 * Actions Schedule Spec Model represents a schedule spec of a workflow file
 *
 * sobird<i@sobird.me> at 2024/11/25 17:00:54 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  // type CreationOptional,
  type ForeignKey,
  type NonAttribute,
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionSchedule } from '.';

export type ActionSchedulePrimaryKey = ActionSchedule['id'];

/**
 * These are all the attributes in the ActionScheduleSpec model
 */
export type ActionScheduleSpecAttributes = InferAttributes<ActionScheduleSpec>;

/** Some attributes are optional in `ActionScheduleSpec.build` and `ActionScheduleSpec.create` calls */
export type ActionScheduleSpecCreationAttributes = InferCreationAttributes<ActionScheduleSpec>;

export class ActionScheduleSpec extends BaseModel<ActionScheduleSpecAttributes, ActionScheduleSpecCreationAttributes> {
  declare repositoryId: bigint;

  // foreign keys are automatically added by associations methods (like ActionScheduleSpec.belongsTo)
  // by branding them using the `ForeignKey` type, `ActionScheduleSpec.init` will know it does not need to
  // display an error if scheduleId is missing.
  declare scheduleId: ForeignKey<ActionSchedule['id']>;

  // `Schedule` is an eagerly-loaded association.
  // We tag it as `NonAttribute`
  declare Schedule: NonAttribute<ActionSchedule>;

  // Next time the job will run, or the zero time if Cron has not been
  // started or this entry's schedule is unsatisfiable
  declare next: Date;

  // Prev is the last time this job was run, or the zero time if never.
  declare prev: Date;

  declare spec: string;

  static async findByIds(ids: number[]) {
    return this.findAll({ where: { id: ids } });
  }

  static associate({ ActionSchedule }: Models) {
    this.belongsTo(ActionSchedule, { foreignKey: 'scheduleId' });
  }

  // belongsTo ActionSchedule associate methods

  declare getActionSchedule: BelongsToGetAssociationMixin<ActionSchedule>;

  declare setActionSchedule: BelongsToSetAssociationMixin<ActionSchedule, ActionSchedulePrimaryKey>;

  declare createActionSchedule: BelongsToCreateAssociationMixin<ActionSchedule>;
}

ActionScheduleSpec.init(
  {
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    scheduleId: {
      type: DataTypes.BIGINT,
    },
    next: {
      type: DataTypes.DATE,
    },
    prev: {
      type: DataTypes.DATE,
    },
    spec: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    modelName: 'ActionScheduleSpec',
  },
);
