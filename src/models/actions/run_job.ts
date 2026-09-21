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
  type WhereOptions,
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

/** The columns an update may write, including the SQL fragment that clears one. */
export type ActionRunJobUpdateValues = {
  [key in keyof InferAttributes<ActionRunJob>]?:
    | InferAttributes<ActionRunJob>[key]
    | ReturnType<typeof sequelize.literal>;
};

/**
 * Whether a job has stopped keeping its run from finishing: a success, a skip, or a
 * failure the job continues on error, which counts as a success.
 */
function isSettled(job: ActionRunJob): boolean {
  return job.status.isSuccess() || job.status.isSkipped() || Boolean(job.continueOnError && job.status.isFailure());
}

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
   * The checks below are a precedence list, read top to bottom: a job that is still on
   * its way decides the aggregate before a finished job does, and a failure a job
   * continues on error counts as a success. Port of gitea's `models/actions/run_job.go`
   * `AggregateJobStatus`.
   */
  static aggregateJobStatus(jobs: ActionRunJob[]): Status {
    if (jobs.length === 0) {
      return Status.Unknown;
    }

    if (jobs.every((job) => job.status.isSkipped())) {
      return Status.Skipped;
    }
    if (jobs.every(isSettled)) {
      return Status.Success;
    }
    if (jobs.some((job) => job.status.isCancelling())) {
      return Status.Cancelling;
    }
    if (jobs.some((job) => job.status.isRunning())) {
      return Status.Running;
    }
    if (jobs.some((job) => job.status.isWaiting())) {
      return Status.Waiting;
    }
    if (jobs.some((job) => job.status.isBlocked())) {
      // Blocked is still pending, so it outranks the terminal statuses below.
      return Status.Blocked;
    }
    if (jobs.some((job) => job.status.isCancelled())) {
      return Status.Cancelled;
    }
    if (jobs.some((job) => job.status.isFailure() && !job.continueOnError)) {
      return Status.Failure;
    }

    // No job carries a status that could decide the aggregate.
    return Status.Unknown;
  }

  /**
   * Write a job's changed columns and let the aggregate state follow.
   *
   * Every status change of a job goes through here, the way gitea routes them all through
   * `UpdateRunJob`, so the attempt and the run can never drift from the jobs they hold.
   * `cond` carries the guard a transition needs to stay correct under concurrent claims,
   * and a write the guard rejects leaves the aggregate alone. Port of gitea's
   * `models/actions/run_job.go` `UpdateRunJob`, without the task-version bump it also
   * performs: this port bumps the version where a task finishes and where a run is created.
   */
  static async updateRunJob(
    job: ActionRunJob,
    values: ActionRunJobUpdateValues,
    cond: WhereOptions<InferAttributes<ActionRunJob>> = {},
    transaction?: Transaction,
  ): Promise<number> {
    const [affected] = await ActionRunJob.update(values, { where: { id: job.id, ...cond }, transaction });
    if (affected > 0) {
      await ActionRunJob.refreshRunStatus(job.runId, Number(job.runAttemptId), Status.Unknown, transaction);
    }

    return affected;
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
  private static async refreshRunStatus(
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
