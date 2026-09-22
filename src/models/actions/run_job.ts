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
  Op,
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
  declare id: CreationOptional<number>;
  declare runId: number;
  declare repositoryId: number;
  declare ownerId: number;
  declare name: string;
  declare commitSha: string;
  declare isForkPullRequest: boolean;

  /** the attempt this job belongs to */
  declare runAttemptId: number;
  /** unique within one attempt; the same job keeps it across attempts */
  declare attemptJobId: number;
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

  /** raw `concurrency` from the job's YAML, as written; empty when it declares none */
  declare rawConcurrency: CreationOptional<string>;
  /**
   * Whether `rawConcurrency` has been resolved into the two columns below.
   *
   * A job whose group reads `needs` is created unresolved too, and stays blocked until the
   * emitter resolves it — so a false flag alone only ever means "not resolved yet".
   */
  declare isConcurrencyEvaluated: CreationOptional<boolean>;
  /** the resolved `concurrency.group` */
  declare concurrencyGroup: CreationOptional<string>;
  /** the resolved `concurrency.cancel-in-progress` */
  declare concurrencyCancel: CreationOptional<boolean>;

  declare status: Status;
  declare startedAt: Date | null;
  declare stoppedAt: Date | null;
  /** maintained by sequelize; typed so the pick cursor can page on it */
  declare updatedAt: CreationOptional<Date>;

  declare run?: NonAttribute<ActionRun>;
  declare runAttempt?: NonAttribute<ActionRunAttempt>;
  declare tasks?: NonAttribute<ActionTask[]>;

  declare static associations: {
    run: Association<ActionRunJob, ActionRun>;
    runAttempt: Association<ActionRunJob, ActionRunAttempt>;
    tasks: Association<ActionRunJob, ActionTask>;
  };

  // ActionRun and ActionRunAttempt come from their own modules above, so they are not
  // taken from the models map.
  static associate({ ActionTask }: Models) {
    this.belongsTo(ActionRun, { as: 'run', foreignKey: 'runId' });
    // The column `attempt` already names the attempt number, so the association that
    // points at the row takes the longer name.
    this.belongsTo(ActionRunAttempt, { as: 'runAttempt', foreignKey: 'runAttemptId' });
    this.hasMany(ActionTask, { as: 'tasks', foreignKey: 'jobId' });
  }

  // associates method
  // ActionTask, alias 'tasks'
  declare getTasks: HasManyGetAssociationsMixin<ActionTask>;
  declare setTasks: HasManySetAssociationsMixin<ActionTask, number>;
  declare addTask: HasManyAddAssociationMixin<ActionTask, number>;
  declare addTasks: HasManyAddAssociationsMixin<ActionTask, number>;
  declare removeTask: HasManyRemoveAssociationMixin<ActionTask, number>;
  declare removeTasks: HasManyRemoveAssociationsMixin<ActionTask, number>;
  declare hasTask: HasManyHasAssociationMixin<ActionTask, number>;
  declare hasTasks: HasManyHasAssociationsMixin<ActionTask, number>;
  declare createTask: HasManyCreateAssociationMixin<ActionTask>;
  declare countTasks: HasManyCountAssociationsMixin;

  // ActionRun, alias 'run'
  declare getRun: BelongsToGetAssociationMixin<ActionRun>;
  declare setRun: BelongsToSetAssociationMixin<ActionRun, number>;
  declare createRun: BelongsToCreateAssociationMixin<ActionRun>;

  // ActionRunAttempt, alias 'runAttempt'
  declare getRunAttempt: BelongsToGetAssociationMixin<ActionRunAttempt>;
  declare setRunAttempt: BelongsToSetAssociationMixin<ActionRunAttempt, number>;
  declare createRunAttempt: BelongsToCreateAssociationMixin<ActionRunAttempt>;

  /**
   * Aggregate the jobs of a run into the status of its attempt.
   *
   * The checks below are a precedence list, read top to bottom: a job that is still on
   * its way decides the aggregate before a finished job does, and a failure a job
   * continues on error counts as a success. Port of gitea's `models/actions/run_job.go`
   * `AggregateJobStatus`.
   */
  static aggregateStatus(jobs: ActionRunJob[]): Status {
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
      await job.refreshRunStatus(Status.Unknown, transaction);
    }

    return affected;
  }

  private async refreshRunStatus(noJobsStatus: Status, transaction?: Transaction): Promise<void> {
    const attempt = await this.getRunAttempt({ transaction });

    const jobs = await attempt.getJobs({ transaction });
    attempt.status = jobs.length > 0 ? ActionRunJob.aggregateStatus(jobs) : noJobsStatus;
    attempt.startedAt = attempt.startedAt ?? (attempt.status.isRunning() ? new Date() : null);
    attempt.stoppedAt = attempt.stoppedAt ?? (attempt.status.isDone() ? new Date() : null);
    await attempt.save({ fields: ['status', 'startedAt', 'stoppedAt'], transaction });

    const run = await attempt.getRun({ transaction });
    if (!run || run.latestAttemptId !== attempt.id) {
      return;
    }
    run.status = attempt.status;
    run.startedAt = attempt.startedAt;
    run.stoppedAt = attempt.stoppedAt;
    await run.save({ fields: ['status', 'startedAt', 'stoppedAt'], transaction });
  }

  /**
   * The attempts and jobs of one repository that sit in a concurrency group and are in
   * the given statuses.
   *
   * Port of gitea's `models/actions/run.go` `GetConcurrentRunAttemptsAndJobs`, kept beside
   * the job-side half it is mostly made of; the attempt-side query lives on
   * `ActionRunAttempt`, as it does upstream.
   */
  static async getConcurrentRunAttemptsAndJobs(
    repositoryId: number,
    concurrencyGroup: string,
    statuses: Status[],
    transaction?: Transaction,
  ): Promise<[ActionRunAttempt[], ActionRunJob[]]> {
    const attempts = await ActionRunAttempt.findConcurrentAttempts(
      repositoryId,
      concurrencyGroup,
      statuses,
      transaction,
    );
    const jobs = await ActionRunJob.findAll({
      where: {
        repositoryId,
        concurrencyGroup,
        status: { [Op.in]: statuses.map((status) => status.toString()) },
      },
      transaction,
    });

    return [attempts, jobs];
  }

  /**
   * Cancel the jobs the group leaves behind once this job is about to start.
   *
   * Port of gitea's `models/actions/run_job.go` `CancelPreviousJobsByJobConcurrency`. The
   * group's own pending jobs go first, and a job that cancels in progress takes the running
   * ones with it; the jobs of every other attempt in the group follow. Jobs of the same
   * attempt as this one are caught by the group query too, so this job is filtered back out.
   */
  static async cancelPreviousJobsByJobConcurrency(
    job: ActionRunJob,
    transaction?: Transaction,
  ): Promise<ActionRunJob[]> {
    if (job.rawConcurrency === '' || !job.isConcurrencyEvaluated || job.concurrencyGroup === '') {
      return [];
    }

    const statuses = [Status.Waiting, Status.Blocked];
    if (job.concurrencyCancel) {
      statuses.push(Status.Running, Status.Cancelling);
    }

    const [attempts, concurrentJobs] = await ActionRunJob.getConcurrentRunAttemptsAndJobs(
      job.repositoryId,
      job.concurrencyGroup,
      statuses,
      transaction,
    );
    const jobsToCancel = concurrentJobs.filter((candidate) => candidate.id !== job.id);

    for (const attempt of attempts) {
      if (attempt.id === job.runAttemptId) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const attemptJobs = await ActionRunJob.findAll({
        where: { runId: attempt.runId, runAttemptId: attempt.id },
        transaction,
      });
      jobsToCancel.push(...attemptJobs);
    }

    return ActionRunJob.cancelJobs(jobsToCancel, transaction);
  }

  /**
   * Cancel every job of the list that nothing has claimed, and return the rows cancelled.
   *
   * Port of gitea's `models/actions/run_job.go` `CancelJobs`, minus the reusable-caller
   * branch this codebase has no reusables for. Each cancellation goes through `updateRunJob`,
   * so the attempt and the run it belongs to follow their job into the cancelled state.
   */
  static async cancelJobs(jobs: ActionRunJob[], transaction?: Transaction): Promise<ActionRunJob[]> {
    const cancelled: ActionRunJob[] = [];

    for (const job of jobs) {
      // eslint-disable-next-line no-await-in-loop
      const cancelledJob = await ActionRunJob.cancelOneJob(job, transaction);
      if (cancelledJob) {
        cancelled.push(cancelledJob);
      }
    }

    return cancelled;
  }

  /**
   * Cancel one unclaimed job and return it; a job that is already done, or one a runner has
   * picked up, is left alone.
   *
   * Port of the `taskId == 0` branch of gitea's `models/actions/run_job.go` `cancelOneJob`.
   * The other branch stops the job's task through `StopTask`, which this codebase has no
   * server-side path to: nothing here can cancel a task a runner is already executing, so a
   * claimed job stays where it is rather than being marked cancelled behind the runner's back.
   */
  static async cancelOneJob(job: ActionRunJob, transaction?: Transaction): Promise<ActionRunJob | null> {
    if (job.status.isDone() || job.taskId !== 0) {
      return null;
    }

    job.status = Status.Cancelled;
    job.stoppedAt = new Date();

    // The guard on the task id is the one a concurrent `pickTask` would have broken, so a
    // job a runner claimed in the meantime is not overwritten.
    const affected = await ActionRunJob.updateRunJob(
      job,
      { status: job.status, stoppedAt: job.stoppedAt },
      { taskId: 0 },
      transaction,
    );
    if (affected !== 1) {
      return null;
    }

    return job;
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
    },
    attemptJobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
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
    rawConcurrency: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    isConcurrencyEvaluated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
      {
        // Serves the "who else is in this concurrency group" check. Named as gitea names
        // it: sqlite index names are database-wide, so this cannot share the name the
        // attempt table's same-shaped index already uses.
        name: 'repo_concurrency',
        fields: ['repository_id', 'concurrency_group', 'status'],
      },
    ],
  },
);
