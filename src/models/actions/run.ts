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
  type Transaction,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

// Like run_job's own import of this class, ActionRunJob comes from its module rather
// than the barrel, which would close an index -> run -> index cycle. It is only
// dereferenced inside a method body, so the two modules may load in either order.
import { ActionRunJob } from './run_job';
import { Status } from './status';

export type ActionRunCreationAttributes = CreationAttributes<ActionRun>;

export class ActionRun extends BaseModel<InferAttributes<ActionRun>, InferCreationAttributes<ActionRun>> {
  declare title: string;
  declare repositoryId: number;
  declare ownerId: number;
  declare workflowId: string;
  declare index: number;
  declare triggerUserId: CreationOptional<bigint | null>;
  declare scheduleId: CreationOptional<bigint>;
  declare ref: string;
  declare commitSha: string;
  declare isForkPullRequest: CreationOptional<boolean>;
  declare needApproval: CreationOptional<boolean>;
  declare approvedBy: CreationOptional<bigint | null>;
  declare eventName: string;
  declare eventPayload: CreationOptional<string>;
  declare triggerEvent: CreationOptional<string>;
  declare status: CreationOptional<Status>;
  declare version: CreationOptional<string>;

  declare rawConcurrency: CreationOptional<string>;
  declare workflowRepoId: CreationOptional<bigint>;
  declare workflowCommitSha: CreationOptional<string>;
  declare isScopedRun: CreationOptional<boolean>;

  declare startedAt: CreationOptional<Date | null>;
  declare stoppedAt: CreationOptional<Date | null>;

  declare previousDuration: CreationOptional<bigint>;
  declare duration: CreationOptional<number>;

  declare latestAttemptId: CreationOptional<number>;

  /**
   * Recompute the status of this run from the jobs of its latest attempt and persist it.
   *
   * The fallback half of `ActionRunJob.refreshRunStatus`: jobs created before attempts
   * existed carry `runAttemptId` 0, and their run has no attempt of its own to
   * aggregate through. `noJobsStatus` settles a run that holds no job at all, which
   * `aggregateStatus` cannot conclude on its own. Port of the fallback branch of
   * gitea's `models/actions/run_job.go` `refreshRunStatus`, whose write that file
   * hands to `run.go`'s `UpdateRun`; here the run writes its own row.
   */
  async refreshStatus(noJobsStatus: Status, transaction?: Transaction): Promise<void> {
    const jobs = await this.getJobs({
      where: { runAttemptId: this.latestAttemptId },
      transaction,
    });

    this.status = jobs.length > 0 ? ActionRunJob.aggregateStatus(jobs) : noJobsStatus;
    // Both times are written once: a re-aggregate that is still pending must not clear them.
    this.startedAt = this.startedAt ?? (this.status.isRunning() ? new Date() : null);
    this.stoppedAt = this.stoppedAt ?? (this.status.isDone() ? new Date() : null);
    await this.save({ fields: ['status', 'startedAt', 'stoppedAt'], transaction });
  }

  static async add() {
    const t = await sequelize.transaction();

    // run.index = index; // todo

    return t.commit();
  }

  // ActionRunJob comes from its own module above, so it is not taken from the models map.
  static associate() {
    this.hasMany(ActionRunJob, { as: 'jobs', foreignKey: 'runId' });
  }

  declare jobs?: NonAttribute<ActionRunJob[]>;

  declare static associations: {
    jobs: Association<ActionRun, ActionRunJob>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getJobs: HasManyGetAssociationsMixin<ActionRunJob>;
  declare setJobs: HasManySetAssociationsMixin<ActionRunJob, bigint>;
  declare addJob: HasManyAddAssociationMixin<ActionRunJob, bigint>;
  declare addJobs: HasManyAddAssociationsMixin<ActionRunJob, bigint>;
  declare removeJob: HasManyRemoveAssociationMixin<ActionRunJob, bigint>;
  declare removeJobs: HasManyRemoveAssociationsMixin<ActionRunJob, bigint>;
  declare hasJob: HasManyHasAssociationMixin<ActionRunJob, bigint>;
  declare hasJobs: HasManyHasAssociationsMixin<ActionRunJob, bigint>;
  declare createJob: HasManyCreateAssociationMixin<ActionRunJob>;
  declare countJobs: HasManyCountAssociationsMixin;

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
      allowNull: false,
      defaultValue: 0,
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
