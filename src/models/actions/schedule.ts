/**
 * Actions Schedule Model represents a schedule of a workflow file
 *
 * sobird<i@sobird.me> at 2024/11/25 17:00:54 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type CreationOptional,
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

export type ActionScheduleCreationAttributes = CreationAttributes<ActionSchedule>;

export class ActionSchedule extends BaseModel<
  InferAttributes<ActionSchedule>,
  InferCreationAttributes<ActionSchedule>
> {
  declare title: string;
  declare specs?: string[];
  declare ownerId: number;
  declare repositoryId: number;
  declare workflowId: string;
  declare triggerUserId: number;
  declare eventName: string;
  declare eventPayload: CreationOptional<Blob>;
  declare ref: string;
  declare commitSha: string;
  declare content: Blob;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  declare scheduleSpecs?: NonAttribute<ActionScheduleSpec[]>; // Note this is optional since it's only populated when explicitly requested in code

  declare static associations: {
    scheduleSpecs: Association<ActionSchedule, ActionScheduleSpec>;
  };

  static associate({ ActionScheduleSpec }: Models) {
    this.hasMany(ActionScheduleSpec, { as: 'scheduleSpecs', foreignKey: 'scheduleId' });
  }

  // hasMany ActionScheduleSpec associate method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getScheduleSpecs: HasManyGetAssociationsMixin<ActionScheduleSpec>;
  /** Remove all previous associations and set the new ones */
  declare setScheduleSpecs: HasManySetAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare addScheduleSpec: HasManyAddAssociationMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare addScheduleSpecs: HasManyAddAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare removeScheduleSpec: HasManyRemoveAssociationMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare removeScheduleSpecs: HasManyRemoveAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare hasScheduleSpec: HasManyHasAssociationMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare hasScheduleSpecs: HasManyHasAssociationsMixin<ActionScheduleSpec, ActionScheduleSpecPrimaryKey>;
  declare createScheduleSpec: HasManyCreateAssociationMixin<ActionScheduleSpec, 'scheduleId'>;
  declare countScheduleSpecs: HasManyCountAssociationsMixin;

  static async findByIds(ids: number[]) {
    return this.findAll({ where: { id: ids } });
  }
}

ActionSchedule.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
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
      type: DataTypes.BIGINT,
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
      type: DataTypes.BLOB,
    },
  },
  {
    sequelize,
    modelName: 'ActionSchedule',
  },
);
