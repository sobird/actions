/**
 * Actions Run ActionRunJob Model
 *
 * sobird<i@sobird.me> at 2024/11/25 16:33:36 created.
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

import type { Models, ActionTask, ActionRun } from '.';
import { Status } from './status';

export type ActionRunJobCreationAttributes = CreationAttributes<ActionRunJob>;

/**
 * ActionRunJob represents a job of a run
 */
export class ActionRunJob extends BaseModel<InferAttributes<ActionRunJob>, InferCreationAttributes<ActionRunJob>> {
  declare runId: number;

  /** the attempt this job belongs to; 0 marks a row from before attempts existed */
  declare runAttemptId: CreationOptional<number>;

  /** unique within one attempt; the same job keeps it across attempts */
  declare attemptJobId: CreationOptional<number>;

  declare repositoryId: number;
  declare ownerId: number;

  declare name: string;
  declare commitSha: string;
  declare isForkPullRequest: boolean;

  /** the (repo, commit) the containing workflow file came from */
  declare workflowSourceRepoId: CreationOptional<number>;

  declare workflowSourceCommitSha: CreationOptional<string>;

  declare attempt: number;

  /** a failure of this job does not fail the run */
  declare continueOnError: CreationOptional<boolean>;

  declare workflowPayload: CreationOptional<Buffer>;

  /** job id in workflow, not job's id */
  declare jobId: string;

  /** the latest task of the job */
  declare taskId: number;

  /** JSON-encoded list of job ids this job depends on */
  declare needs: CreationOptional<string>;

  /** JSON-encoded list of labels this job requires */
  declare runsOn: CreationOptional<string>;

  declare status: Status;

  declare started: Date | null;

  declare stopped: Date | null;

  declare run?: NonAttribute<ActionRun>;

  static associate({ ActionRun, ActionTask }: Models) {
    this.belongsTo(ActionRun, { as: 'run', foreignKey: 'runId' });
    this.hasMany(ActionTask, { foreignKey: 'jobId' });
  }

  declare static associations: {
    Run: Association<ActionRunJob, ActionRun>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionTasks: HasManyGetAssociationsMixin<ActionTask>;
  /** Remove all previous associations and set the new ones */
  declare setActionTasks: HasManySetAssociationsMixin<ActionTask, bigint>;
  declare addActionTask: HasManyAddAssociationMixin<ActionTask, bigint>;
  declare addActionTasks: HasManyAddAssociationsMixin<ActionTask, bigint>;
  declare removeActionTask: HasManyRemoveAssociationMixin<ActionTask, bigint>;
  declare removeActionTasks: HasManyRemoveAssociationsMixin<ActionTask, bigint>;
  declare hasActionTask: HasManyHasAssociationMixin<ActionTask, bigint>;
  declare hasActionTasks: HasManyHasAssociationsMixin<ActionTask, bigint>;
  declare createActionTask: HasManyCreateAssociationMixin<ActionTask>;
  declare countActionTasks: HasManyCountAssociationsMixin;

  // ActionRun
  declare getActionRun: BelongsToGetAssociationMixin<ActionRun>;
  declare setActionRun: BelongsToSetAssociationMixin<ActionRun, bigint>;
  declare createActionRun: BelongsToCreateAssociationMixin<ActionRun>;

  /**
   * Aggregate the jobs of a run into the status of its attempt.
   *
   * Port of gitea's `models/actions/run_job.go` `AggregateJobStatus`.
   */
  static aggregateJobStatus(jobs: ActionRunJob[]): Status {
    let allSuccessOrSkipped = jobs.length !== 0;
    let allSkipped = jobs.length !== 0;
    let hasFailure = false;
    let hasCancelled = false;
    let hasCancelling = false;
    let hasWaiting = false;
    let hasRunning = false;
    let hasBlocked = false;

    for (const job of jobs) {
      // A failure with continue-on-error does not fail the run: it counts as a
      // "continued failure" and is treated like success below.
      const isContinuedFailure = job.continueOnError && job.status.isFailure();
      allSuccessOrSkipped =
        allSuccessOrSkipped && (job.status.isSuccess() || job.status.isSkipped() || isContinuedFailure);
      allSkipped = allSkipped && job.status.isSkipped();
      hasFailure = hasFailure || (job.status.isFailure() && !job.continueOnError);
      hasCancelled = hasCancelled || job.status.isCancelled();
      hasCancelling = hasCancelling || job.status.isCancelling();
      hasWaiting = hasWaiting || job.status.isWaiting();
      hasRunning = hasRunning || job.status.isRunning();
      hasBlocked = hasBlocked || job.status.isBlocked();
    }

    if (allSkipped) {
      return Status.Skipped;
    }
    if (allSuccessOrSkipped) {
      return Status.Success;
    }
    if (hasCancelling) {
      return Status.Cancelling;
    }
    if (hasRunning) {
      return Status.Running;
    }
    if (hasWaiting) {
      return Status.Waiting;
    }
    if (hasBlocked) {
      // Blocked is still pending, so it outranks the terminal statuses below.
      return Status.Blocked;
    }
    if (hasCancelled) {
      return Status.Cancelled;
    }
    if (hasFailure) {
      return Status.Failure;
    }
    return Status.Unknown;
  }
}

ActionRunJob.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    runId: {
      type: DataTypes.INTEGER,
    },
    runAttemptId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    attemptJobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },

    name: {
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
    commitSha: {
      type: DataTypes.STRING,
    },
    isForkPullRequest: {
      type: DataTypes.BOOLEAN,
    },
    workflowSourceRepoId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    workflowSourceCommitSha: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
    },
    attempt: {
      type: DataTypes.INTEGER,
    },
    continueOnError: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    workflowPayload: {
      type: DataTypes.BLOB,
    },
    jobId: {
      type: DataTypes.CHAR(255),
    },
    taskId: {
      type: DataTypes.INTEGER,
      comment: 'the latest task of the job',
    },
    needs: {
      type: DataTypes.TEXT,
    },
    runsOn: {
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
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,
  },
  {
    sequelize,
  },
);
