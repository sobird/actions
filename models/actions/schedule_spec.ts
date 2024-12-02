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

import type { Models, ActionsSchedule } from '.';

export type ActionsSchedulePrimaryKey = ActionsSchedule['id'];

/**
 * These are all the attributes in the ActionsScheduleSpec model
 */
export type ActionsScheduleSpecAttributes = InferAttributes<ActionsScheduleSpec>;

/** Some attributes are optional in `ActionsScheduleSpec.build` and `ActionsScheduleSpec.create` calls */
export type ActionsScheduleSpecCreationAttributes = InferCreationAttributes<ActionsScheduleSpec>;

class ActionsScheduleSpec extends BaseModel<ActionsScheduleSpecAttributes, ActionsScheduleSpecCreationAttributes> {
  declare repositoryId: bigint;

  // foreign keys are automatically added by associations methods (like ActionsScheduleSpec.belongsTo)
  // by branding them using the `ForeignKey` type, `ActionsScheduleSpec.init` will know it does not need to
  // display an error if scheduleId is missing.
  declare scheduleId: ForeignKey<ActionsSchedule['id']>;

  // `Schedule` is an eagerly-loaded association.
  // We tag it as `NonAttribute`
  declare Schedule: NonAttribute<ActionsSchedule>;

  // Next time the job will run, or the zero time if Cron has not been
  // started or this entry's schedule is unsatisfiable
  declare next: Date;

  // Prev is the last time this job was run, or the zero time if never.
  declare prev: Date;

  declare spec: string;

  static async findByIds(ids: number[]) {
    return this.findAll({ where: { id: ids } });
  }

  static associate({ ActionsSchedule }: Models) {
    this.belongsTo(ActionsSchedule, { foreignKey: 'scheduleId' });
  }

  // belongsTo ActionsSchedule

  declare getActionsSchedule: BelongsToGetAssociationMixin<ActionsSchedule>;

  declare setActionsSchedule: BelongsToSetAssociationMixin<ActionsSchedule, ActionsSchedulePrimaryKey>;

  declare createActionsSchedule: BelongsToCreateAssociationMixin<ActionsSchedule>;
}

ActionsScheduleSpec.init(
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
    modelName: 'ActionsScheduleSpec',
  },
);

export default ActionsScheduleSpec;
