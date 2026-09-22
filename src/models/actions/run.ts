/**
 * Actions Run Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:10:16 created.
 */

import {
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationAttributes,
  type CreationOptional,
  type Association,
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

// Like run_job's own import of them, the two classes come from their own modules
// rather than the barrel, which would close an index -> run -> index cycle. They are
// only dereferenced inside a method body, so the modules may load in either order.
import { ActionRunAttempt } from './run_attempt';
import { ActionRunJob } from './run_job';
import { Status } from './status';

export type ActionRunCreationAttributes = CreationAttributes<ActionRun>;

export class ActionRun extends BaseModel<InferAttributes<ActionRun>, InferCreationAttributes<ActionRun>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare repositoryId: number;
  declare ownerId: number;
  declare workflowId: string;
  declare index: number;
  declare triggerUserId: CreationOptional<number | null>;
  declare scheduleId: CreationOptional<number>;
  declare ref: string;
  declare commitSha: string;
  declare isForkPullRequest: CreationOptional<boolean>;
  declare needApproval: CreationOptional<boolean>;
  declare approvedBy: CreationOptional<number | null>;
  declare eventName: string;
  declare eventPayload: CreationOptional<string>;
  declare triggerEvent: CreationOptional<string>;
  declare status: CreationOptional<Status>;
  declare version: CreationOptional<string>;

  declare rawConcurrency: CreationOptional<string>;
  declare workflowRepoId: CreationOptional<number>;
  declare workflowCommitSha: CreationOptional<string>;
  declare isScopedRun: CreationOptional<boolean>;

  declare startedAt: CreationOptional<Date | null>;
  declare stoppedAt: CreationOptional<Date | null>;

  declare previousDuration: CreationOptional<bigint>;
  declare duration: CreationOptional<number>;

  /** the attempt that drives this run's status; null until the run has one */
  declare latestAttemptId: CreationOptional<number | null>;

  static async add() {
    const t = await sequelize.transaction();

    // run.index = index; // todo

    return t.commit();
  }

  // The two classes come from their own modules above, so they are not taken from the
  // models map.
  static associate() {
    this.hasMany(ActionRunJob, { as: 'jobs', foreignKey: 'runId' });
    this.hasMany(ActionRunAttempt, { as: 'attempts', foreignKey: 'runId' });
    // A run is inserted before its first attempt exists, so the pointer is null until
    // createRun writes it. Deleting the attempt it points at leaves the run without a
    // latest attempt rather than deleting the run with it.
    this.belongsTo(ActionRunAttempt, { as: 'latestAttempt', foreignKey: 'latestAttemptId', onDelete: 'SET NULL' });
  }

  declare jobs?: NonAttribute<ActionRunJob[]>;
  declare attempts?: NonAttribute<ActionRunAttempt[]>;
  declare latestAttempt?: NonAttribute<ActionRunAttempt>;

  declare static associations: {
    jobs: Association<ActionRun, ActionRunJob>;
    attempts: Association<ActionRun, ActionRunAttempt>;
    latestAttempt: Association<ActionRun, ActionRunAttempt>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
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

  declare getAttempts: HasManyGetAssociationsMixin<ActionRunAttempt>;
  declare setAttempts: HasManySetAssociationsMixin<ActionRunAttempt, number>;
  declare addAttempt: HasManyAddAssociationMixin<ActionRunAttempt, number>;
  declare addAttempts: HasManyAddAssociationsMixin<ActionRunAttempt, number>;
  declare removeAttempt: HasManyRemoveAssociationMixin<ActionRunAttempt, number>;
  declare removeAttempts: HasManyRemoveAssociationsMixin<ActionRunAttempt, number>;
  declare hasAttempt: HasManyHasAssociationMixin<ActionRunAttempt, number>;
  declare hasAttempts: HasManyHasAssociationsMixin<ActionRunAttempt, number>;
  declare createAttempt: HasManyCreateAssociationMixin<ActionRunAttempt>;
  declare countAttempts: HasManyCountAssociationsMixin;

  declare getLatestAttempt: BelongsToGetAssociationMixin<ActionRunAttempt>;
  declare setLatestAttempt: BelongsToSetAssociationMixin<ActionRunAttempt, number>;
  declare createLatestAttempt: BelongsToCreateAssociationMixin<ActionRunAttempt>;

  static validate() {
    throw Error('dd');
  }
}

ActionRun.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
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
      allowNull: false,
    },
    index: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    triggerUserId: {
      type: DataTypes.BIGINT,
    },
    scheduleId: {
      type: DataTypes.BIGINT,
    },
    ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    commitSha: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    isForkPullRequest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    needApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approvedBy: {
      type: DataTypes.BIGINT,
    },
    eventName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eventPayload: {
      type: DataTypes.TEXT,
    },
    triggerEvent: {
      type: DataTypes.STRING,
    },
    status: {
      // https://github.com/sequelize/sequelize/issues/5765
      type: DataTypes.ENUM,
      values: Status.names(),
      defaultValue: Status.Unknown.toString(),
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
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rawConcurrency: {
      type: DataTypes.STRING,
    },
    workflowRepoId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    workflowCommitSha: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
    },
    isScopedRun: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    previousDuration: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    duration: DataTypes.BIGINT,
    latestAttemptId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    startedAt: DataTypes.DATE,
    stoppedAt: DataTypes.DATE,
  },
  {
    sequelize,
    indexes: [
      {
        name: 'repo_index_unique',
        unique: true,
        fields: ['repository_id', 'index'],
      },
      {
        name: 'action_run_repo_id_index',
        fields: ['repository_id'],
      },
      {
        name: 'action_run_owner_id_index',
        fields: ['owner_id'],
      },
      {
        name: 'action_run_workflow_id_index',
        fields: ['workflow_id'],
      },
      {
        name: 'action_run_trigger_user_id_index',
        fields: ['trigger_user_id'],
      },
      {
        name: 'action_run_ref_index',
        fields: ['ref'],
      },
      {
        name: 'action_run_approved_by_index',
        fields: ['approved_by'],
      },
      {
        name: 'action_run_status_index',
        fields: ['status'],
      },
      {
        name: 'action_run_latest_attempt_id_index',
        fields: ['latest_attempt_id'],
      },
    ],
  },
);
