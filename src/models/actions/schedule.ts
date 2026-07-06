/**
 * Actions Schedule Model represents a schedule of a workflow file
 *
 * sobird<i@sobird.me> at 2024/11/25 17:00:54 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  // type CreationOptional,
  type NonAttribute,
  type Association,
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

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionScheduleSpec } from '.';

export type ActionScheduleSpecPrimaryKey = ActionScheduleSpec['id'];

/**
 * These are all the attributes in the ActionSchedule model
 *
 * `ScheduleSpecs` is excluded as it's not an attribute, it's an association.
 */
export type ActionScheduleAttributes = InferAttributes<ActionSchedule, { omit: 'ScheduleSpecs' }>;

/** Some attributes are optional in `ActionSchedule.build` and `ActionSchedule.create` calls */
export type ActionScheduleCreationAttributes = InferCreationAttributes<ActionSchedule, { omit: 'ScheduleSpecs' }>;

export class ActionSchedule extends BaseModel<ActionScheduleAttributes, ActionScheduleCreationAttributes> {
  declare title: string;

  declare specs?: string[];

  declare ownerId: number;

  declare repositoryId: number;

  declare workflowId: string;

  declare triggerUserId: number;

  declare eventName: string;

  declare eventPayload: Blob;

  declare ref: string;

  declare commitSha: string;

  declare content: string;

  static async findByIds(ids: number[]) {
    return this.findAll({ where: { id: ids } });
  }

  static associate({ ActionScheduleSpec }: Models) {
    this.hasMany(ActionScheduleSpec, { foreignKey: 'scheduleId' });
  }

  // hasMany ActionScheduleSpec associate method

  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionScheduleSpecs: HasManyGetAssociationsMixin<ActionScheduleSpec>;

  /** Remove all previous associations and set the new ones */
  declare setActionScheduleSpecs: HasManySetAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare addActionScheduleSpec: HasManyAddAssociationMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare addActionScheduleSpecs: HasManyAddAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare removeActionScheduleSpec: HasManyRemoveAssociationMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare removeActionScheduleSpecs: HasManyRemoveAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare hasActionScheduleSpec: HasManyHasAssociationMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare hasActionScheduleSpecs: HasManyHasAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;

  declare createActionScheduleSpec: HasManyCreateAssociationMixin<ActionScheduleSpec, 'scheduleId'>;

  declare countActionScheduleSpecs: HasManyCountAssociationsMixin;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  declare ScheduleSpecs?: NonAttribute<ActionScheduleSpec[]>; // Note this is optional since it's only populated when explicitly requested in code

  declare static associations: {
    projects: Association<ActionSchedule, ActionScheduleSpec>;
  };
}

ActionSchedule.init(
  {
    title: {
      type: DataTypes.STRING,
    },
    specs: {
      type: DataTypes.STRING,
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    repositoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    workflowId: {
      type: DataTypes.STRING,
    },
    triggerUserId: {
      type: DataTypes.INTEGER,
    },
    eventName: {
      type: DataTypes.STRING,
    },
    eventPayload: {
      type: DataTypes.BLOB,
    },
    ref: {
      type: DataTypes.CHAR(255),
    },
    commitSha: {
      type: DataTypes.CHAR(255),
    },
    content: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'ActionSchedule',
  },
);
