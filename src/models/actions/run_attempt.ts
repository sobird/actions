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
  type CreationOptional,
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
  type BelongsToGetAssociationMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToCreateAssociationMixin,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionRun, ActionRunJob } from '.';
import { Status } from './status';

export type ActionRunAttemptCreationAttributes = CreationAttributes<ActionRunAttempt>;

/**
 * ActionRunAttempt represents a single execution attempt of a run
 */
export class ActionRunAttempt extends BaseModel<
  InferAttributes<ActionRunAttempt>,
  InferCreationAttributes<ActionRunAttempt>
> {
  declare id: CreationOptional<number>;
  declare runId: number;
  declare attempt: number;
  declare repositoryId: number;

  declare triggerUserId: number;

  declare concurrencyGroup: string;
  declare concurrencyCancel: boolean;

  declare status: Status;
  declare startedAt: Date | null;
  declare stoppedAt: Date | null;

  declare run?: NonAttribute<ActionRun>;
  declare jobs?: NonAttribute<ActionRunJob[]>;

  static associate({ ActionRun, ActionRunJob }: Models) {
    this.belongsTo(ActionRun, { as: 'run', foreignKey: 'runId' });
    this.hasMany(ActionRunJob, { as: 'jobs', foreignKey: 'runAttemptId' });
  }

  declare static associations: {
    run: Association<ActionRunAttempt, ActionRun>;
    jobs: Association<ActionRunAttempt, ActionRunJob>;
  };

  declare getRun: BelongsToGetAssociationMixin<ActionRun>;
  declare setRun: BelongsToSetAssociationMixin<ActionRun, number>;
  declare createRun: BelongsToCreateAssociationMixin<ActionRun>;

  declare getJobs: HasManyGetAssociationsMixin<ActionRunJob>;
  declare setJobs: HasManySetAssociationsMixin<ActionRunJob, number>;
  declare addJob: HasManyAddAssociationMixin<ActionRunJob, number>;
  declare addJobs: HasManyAddAssociationsMixin<ActionRunJob, number>;
  declare removeJob: HasManyRemoveAssociationMixin<ActionRunJob, number>;
  declare removeJobs: HasManyRemoveAssociationsMixin<ActionRunJob, number>;
  declare hasJob: HasManyHasAssociationMixin<ActionRunJob, number>;
  declare hasJobs: HasManyHasAssociationsMixin<ActionRunJob, number>;
  declare createJob: HasManyCreateAssociationMixin<ActionRunJob>;
  declare countJobs: HasManyCountAssociationsMixin;
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
