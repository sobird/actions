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
  type Transaction,
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionTask } from '.';
// The two classes below are used as values, so they come from their own modules rather than
// the barrel: importing a value from '.' would close the index -> run_job -> index cycle.
// A class import supplies the type as well, so no separate type-only import is needed.
import { ActionRun } from './run';
import { ActionRunAttempt } from './run_attempt';
import { Status } from './status';

export type ActionRunJobCreationAttributes = CreationAttributes<ActionRunJob>;

/**
 * ActionRunJob represents a job of a run
 */
export class ActionRunJob extends BaseModel<InferAttributes<ActionRunJob>, InferCreationAttributes<ActionRunJob>> {
  declare runId: number;
  declare repositoryId: number;
  declare ownerId: number;
  declare name: string;
  declare commitSha: string;
  declare isForkPullRequest: boolean;

  /** the attempt this job belongs to; 0 marks a row from before attempts existed */
  declare runAttemptId: CreationOptional<number>;
  /** unique within one attempt; the same job keeps it across attempts */
  declare attemptJobId: CreationOptional<number>;
  declare attempt: number;

  /** the (repo, commit) the containing workflow file came from */
  declare workflowSourceRepoId: CreationOptional<number>;
  declare workflowSourceCommitSha: CreationOptional<string>;

  /** job id in workflow, not job's id */
  declare jobId: string;
  /** the latest task of the job */
  declare taskId: number;
  /** JSON-encoded list of job ids this job depends on */
  declare needs: CreationOptional<string>;
  /** JSON-encoded list of labels this job requires */
  declare runsOn: CreationOptional<string>;

  declare workflowPayload: CreationOptional<Buffer>;
  /** a failure of this job does not fail the run */
  declare continueOnError: CreationOptional<boolean>;

  declare status: Status;
  declare startedAt: Date | null;
  declare stoppedAt: Date | null;
  /** maintained by sequelize; typed so the pick cursor can page on it */
  declare updatedAt: CreationOptional<Date>;

  declare run?: NonAttribute<ActionRun>;
  declare tasks?: NonAttribute<ActionTask[]>;

  declare static associations: {
    run: Association<ActionRunJob, ActionRun>;
    tasks: Association<ActionRunJob, ActionTask>;
  };

  // ActionRun comes from its own module above, so it is not taken from the models map.
  static associate({ ActionTask }: Models) {
    this.belongsTo(ActionRun, { as: 'run', foreignKey: 'runId' });
    this.hasMany(ActionTask, { as: 'tasks', foreignKey: 'jobId' });
  }

  // associates method
  // ActionTask, alias 'tasks'
  declare getTasks: HasManyGetAssociationsMixin<ActionTask>;
  declare setTasks: HasManySetAssociationsMixin<ActionTask, bigint>;
  declare addTask: HasManyAddAssociationMixin<ActionTask, bigint>;
  declare addTasks: HasManyAddAssociationsMixin<ActionTask, bigint>;
  declare removeTask: HasManyRemoveAssociationMixin<ActionTask, bigint>;
  declare removeTasks: HasManyRemoveAssociationsMixin<ActionTask, bigint>;
  declare hasTask: HasManyHasAssociationMixin<ActionTask, bigint>;
  declare hasTasks: HasManyHasAssociationsMixin<ActionTask, bigint>;
  declare createTask: HasManyCreateAssociationMixin<ActionTask>;
  declare countTasks: HasManyCountAssociationsMixin;

  // ActionRun, alias 'run'
  declare getRun: BelongsToGetAssociationMixin<ActionRun>;
  declare setRun: BelongsToSetAssociationMixin<ActionRun, bigint>;
  declare createRun: BelongsToCreateAssociationMixin<ActionRun>;

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

  /**
   * Recompute the status of a run attempt from the jobs it holds and persist it.
   *
   * The latest attempt carries its status, start and stop onto its run; an older one
   * only updates itself, because a later attempt already drives the run. `noJobsStatus`
   * settles an attempt that holds no job at all, which `aggregateJobStatus` cannot
   * conclude on its own. Port of gitea's `models/actions/run_job.go` `refreshRunStatus`,
   * with `UpdateRunAttempt`'s propagation folded in.
   */
  static async refreshRunStatus(
    runId: number,
    runAttemptId: number,
    noJobsStatus: Status,
    transaction?: Transaction,
  ): Promise<void> {
    if (runAttemptId > 0) {
      const attempt = await ActionRunAttempt.findByPk(runAttemptId, { transaction });
      if (!attempt) {
        throw new Error(`run attempt with id ${runAttemptId}: not exist`);
      }

      const jobs = await ActionRunJob.findAll({ where: { runId, runAttemptId }, transaction });
      attempt.status = jobs.length > 0 ? ActionRunJob.aggregateJobStatus(jobs) : noJobsStatus;
      // Both times are written once: a re-aggregate that is still pending must not clear them.
      attempt.startedAt = attempt.startedAt ?? (attempt.status.isRunning() ? new Date() : null);
      attempt.stoppedAt = attempt.stoppedAt ?? (attempt.status.isDone() ? new Date() : null);
      await attempt.save({ fields: ['status', 'startedAt', 'stoppedAt'], transaction });

      const run = await ActionRun.findByPk(runId, { transaction });
      if (!run || Number(run.latestAttemptId) !== Number(attempt.id)) {
        return;
      }
      run.status = attempt.status;
      run.startedAt = attempt.startedAt;
      run.stoppedAt = attempt.stoppedAt;
      await run.save({ fields: ['status', 'startedAt', 'stoppedAt'], transaction });
      return;
    }

    // Legacy fallback: jobs of runs that predate attempts carry attempt 0, and their run
    // has no attempt of its own to aggregate through.
    const run = await ActionRun.findByPk(runId, { transaction });
    if (!run) {
      throw new Error(`run with id ${runId}: not exist`);
    }

    const jobs = await ActionRunJob.findAll({ where: { runId, runAttemptId: run.latestAttemptId }, transaction });
    run.status = jobs.length > 0 ? ActionRunJob.aggregateJobStatus(jobs) : noJobsStatus;
    run.startedAt = run.startedAt ?? (run.status.isRunning() ? new Date() : null);
    run.stoppedAt = run.stoppedAt ?? (run.status.isDone() ? new Date() : null);
    await run.save({ fields: ['status', 'startedAt', 'stoppedAt'], transaction });
  }
}

ActionRunJob.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    runId: {
      type: DataTypes.BIGINT,
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
      allowNull: false,
      defaultValue: false,
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
      allowNull: false,
      defaultValue: 1,
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
      type: DataTypes.STRING,
    },
    taskId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
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
      allowNull: false,
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
    startedAt: DataTypes.DATE,
    stoppedAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    indexes: [
      {
        name: 'action_run_jobs_run_id_index',
        fields: ['run_id'],
      },
      {
        name: 'action_run_jobs_status_index',
        fields: ['status'],
      },
      {
        // Serves the "is any waiting, unclaimed job left for this repo" check.
        name: 'action_run_jobs_repo_status_task_index',
        fields: ['repository_id', 'status', 'task_id'],
      },
    ],
  },
);
