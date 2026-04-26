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

import type { Models, ActionsScheduleSpec } from '.';

export type ActionsScheduleSpecPrimaryKey = ActionsScheduleSpec['id'];

/**
 * These are all the attributes in the ActionsSchedule model
 *
 * `ScheduleSpecs` is excluded as it's not an attribute, it's an association.
 */
export type ActionsScheduleAttributes = InferAttributes<ActionsSchedule, { omit: 'ScheduleSpecs' }>;

/** Some attributes are optional in `ActionsSchedule.build` and `ActionsSchedule.create` calls */
export type ActionsScheduleCreationAttributes = InferCreationAttributes<ActionsSchedule, { omit: 'ScheduleSpecs' }>;

class ActionsSchedule extends BaseModel<ActionsScheduleAttributes, ActionsScheduleCreationAttributes> {
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

  static associate({ ActionsScheduleSpec }: Models) {
    this.hasMany(ActionsScheduleSpec, { foreignKey: 'scheduleId' });
  }

  // hasMany ActionsScheduleSpec associate method

  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionsScheduleSpecs: HasManyGetAssociationsMixin<ActionsScheduleSpec>;

  /** Remove all previous associations and set the new ones */
  declare setActionsScheduleSpecs: HasManySetAssociationsMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare addActionsScheduleSpec: HasManyAddAssociationMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare addActionsScheduleSpecs: HasManyAddAssociationsMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare removeActionsScheduleSpec: HasManyRemoveAssociationMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare removeActionsScheduleSpecs: HasManyRemoveAssociationsMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare hasActionsScheduleSpec: HasManyHasAssociationMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare hasActionsScheduleSpecs: HasManyHasAssociationsMixin<ActionsScheduleSpec, ActionsScheduleSpecPrimaryKey>;

  declare createActionsScheduleSpec: HasManyCreateAssociationMixin<ActionsScheduleSpec, 'scheduleId'>;

  declare countActionsScheduleSpecs: HasManyCountAssociationsMixin;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  declare ScheduleSpecs?: NonAttribute<ActionsScheduleSpec[]>; // Note this is optional since it's only populated when explicitly requested in code

  declare static associations: {
    projects: Association<ActionsSchedule, ActionsScheduleSpec>;
  };
}

ActionsSchedule.init(
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
    modelName: 'ActionsSchedule',
  },
);

// ActionsSchedule.beforeCreate((model) => {

// });

export default ActionsSchedule;
