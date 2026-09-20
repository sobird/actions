/**
 * Actions Task Model
 *
 * sobird<i@sobird.me> at 2024/11/23 12:21:49 created.
 */

import { timestampDate, type Timestamp } from '@bufbuild/protobuf/wkt';
import {
  DataTypes,
  type Association,
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

import { Result, type StepState, type TaskState } from '@/gen/runner/v1/messages_pb';
import { sequelize, BaseModel } from '@/lib/sequelize';
import { logFileName } from '@/utils';
import Workflow from '@/workflow';

import type { Models, ActionRunJob, ActionRunner, ActionTaskStep } from '.';
import { ActionRunJob as ActionRunJobModel } from './run_job';
import { ActionRunner as ActionRunnerModel } from './runner';
import { Status } from './status';
import { ActionTaskStep as ActionTaskStepModel } from './task_step';
import { generateToken, generateTokenSalt, hashToken } from './token';

export type ActionTaskCreationAttributes = CreationAttributes<ActionTask>;

/** A zero or absent timestamp means "unset", mirroring upstream convertTimestamp */
function convertTimestamp(timestamp?: Timestamp) {
  if (!timestamp || (timestamp.seconds === 0n && timestamp.nanos === 0)) {
    return undefined;
  }
  return timestampDate(timestamp);
}

export class ActionTask extends BaseModel<InferAttributes<ActionTask>, InferCreationAttributes<ActionTask>> {
  declare jobId: number;
  declare runnerId: bigint;
  declare attempt: CreationOptional<number>;
  declare status: CreationOptional<Status>;
  declare startedAt: CreationOptional<Date | null>;
  declare stoppedAt: CreationOptional<Date | null>;
  declare repositoryId: number;
  declare ownerId: number;
  declare commitSha: string;
  declare isForkPullRequest: CreationOptional<boolean>;
  declare token: CreationOptional<string>;
  declare tokenSalt: CreationOptional<string>;
  declare tokenHash: CreationOptional<string>;
  declare tokenLastEight: CreationOptional<string>;
  declare logFilename: string;
  declare logInStorage: boolean;
  declare logLength: number;
  declare logSize: number;
  // declare logIndexes: number;
  declare logExpired: boolean;

  declare job?: NonAttribute<ActionRunJob>;
  declare runner?: NonAttribute<ActionRunner>;
  declare steps?: NonAttribute<ActionTaskStep[]>;

  declare static associations: {
    job: Association<ActionTask, ActionRunJob>;
    runner: Association<ActionTask, ActionRunner>;
    steps: Association<ActionTask, ActionTaskStep>;
  };

  static associate({ ActionRunJob, ActionRunner, ActionTaskStep }: Models) {
    this.belongsTo(ActionRunJob, { as: 'job', foreignKey: 'jobId' });
    this.belongsTo(ActionRunner, { as: 'runner', foreignKey: 'runnerId' });
    this.hasMany(ActionTaskStep, { as: 'steps', foreignKey: 'taskId' });
  }

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  // 名字跟着 associate 里的 alias 走：alias 是 'steps'，sequelize 生成的就是 getSteps 这一组
  declare getSteps: HasManyGetAssociationsMixin<ActionTaskStep>;
  declare setSteps: HasManySetAssociationsMixin<ActionTaskStep, bigint>;
  declare addStep: HasManyAddAssociationMixin<ActionTaskStep, bigint>;
  declare addSteps: HasManyAddAssociationsMixin<ActionTaskStep, bigint>;
  declare removeStep: HasManyRemoveAssociationMixin<ActionTaskStep, bigint>;
  declare removeSteps: HasManyRemoveAssociationsMixin<ActionTaskStep, bigint>;
  declare hasStep: HasManyHasAssociationMixin<ActionTaskStep, bigint>;
  declare hasSteps: HasManyHasAssociationsMixin<ActionTaskStep, bigint>;
  declare createStep: HasManyCreateAssociationMixin<ActionTaskStep>;
  declare countSteps: HasManyCountAssociationsMixin;

  // ActionRunJob, alias 'job'
  declare getJob: BelongsToGetAssociationMixin<ActionRunJob>;
  declare setJob: BelongsToSetAssociationMixin<ActionRunJob, bigint>;
  declare createJob: BelongsToCreateAssociationMixin<ActionRunJob>;

  // ActionRunner, alias 'runner'
  declare getRunner: BelongsToGetAssociationMixin<ActionRunner>;
  declare setRunner: BelongsToSetAssociationMixin<ActionRunner, bigint>;
  declare createRunner: BelongsToCreateAssociationMixin<ActionRunner>;

  /**
   * Claim a waiting job for the runner and materialize it as a task.
   *
   * The job is claimed with an optimistic update, so two runners racing for the
   * same job produce exactly one task; the loser gets `null`.
   */
  public static async createForRunner(runner: ActionRunner, job: ActionRunJob): Promise<ActionTask | null> {
    const now = new Date();
    const repoFullName = `repo_${job.repositoryId}`;
    let created: ActionTask | null = null;

    try {
      await sequelize.transaction(async (transaction) => {
        const task = await this.create(
          {
            jobId: Number(job.id!),
            runnerId: runner.id!,
            attempt: job.attempt || 1,
            status: Status.Running,
            startedAt: now,
            repositoryId: job.repositoryId,
            ownerId: job.ownerId,
            commitSha: job.commitSha,
            isForkPullRequest: job.isForkPullRequest ?? false,
            logFilename: '',
            logInStorage: false,
            logLength: 0,
            logSize: 0,
            logExpired: false,
          },
          { transaction },
        );

        // logFilename embeds the task id, which only exists after the insert.
        task.logFilename = logFileName(repoFullName, task.id!);
        await task.save({ fields: ['logFilename'], transaction });

        await this.createSteps(task, job, transaction);

        const [affectedCount] = await ActionRunJobModel.update(
          { taskId: Number(task.id), status: Status.Running, startedAt: now },
          {
            where: { id: job.id, taskId: 0, status: Status.Waiting.toString() },
            transaction,
          },
        );
        if (affectedCount !== 1) {
          throw new Error('job already claimed by another runner');
        }

        task.job = job;
        created = task;
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'job already claimed by another runner') {
        return null;
      }
      throw error;
    }

    return created;
  }

  /**
   * Undo a claim whose task payload could not be built, so the job goes back to
   * the waiting queue instead of deadlocking in running.
   */
  public static async releaseTaskForRunner(task: ActionTask) {
    await sequelize.transaction(async (transaction) => {
      await ActionRunJobModel.update(
        // 连接层开了 omitNull，赋值 null 会被 UPDATE 整条丢掉，置空只能写 literal
        { taskId: 0, status: Status.Waiting, startedAt: sequelize.literal('NULL') },
        { where: { id: task.jobId, taskId: Number(task.id) }, transaction },
      );
      await ActionTaskStepModel.destroy({ where: { taskId: Number(task.id) }, transaction });
      await task.destroy({ transaction });
    });
  }

  /**
   * Persist the TaskState a runner reports for one of its tasks.
   *
   * Mirrors gitea's UpdateTaskByState: a final result lands on the task and its
   * job at once, the reported step states are matched to the step rows by index,
   * and an in-flight report only refreshes `updated` so the task is not mistaken
   * for a zombie. A caller may hand in its transaction to keep the update in one
   * unit of work with what it does next, otherwise this opens its own.
   */
  public static async updateByState(
    runnerId: bigint,
    state: TaskState,
    transaction?: Transaction,
  ): Promise<ActionTask> {
    if (transaction) {
      return this.applyState(runnerId, state, transaction);
    }
    return sequelize.transaction((t) => this.applyState(runnerId, state, t));
  }

  private static async applyState(runnerId: bigint, state: TaskState, transaction: Transaction): Promise<ActionTask> {
    const task = await this.findByPk(state.id, { transaction });
    if (!task) {
      throw new Error(`task with id ${state.id}: not exist`);
    }
    // Coerce before comparing: the column reads back as a number or a string depending on
    // the dialect, so a strict bigint comparison would reject the task's own runner.
    if (Number(runnerId) !== Number(task.runnerId)) {
      throw new Error('invalid runner for task');
    }

    if (task.status.isDone()) {
      // the state is final, do nothing
      return task;
    }

    // state.result is not unspecified means the task is finished
    if (state.result !== Result.UNSPECIFIED) {
      // The runner may report SUCCESS/FAILURE for the cleanup phase; preserve user intent.
      const status = task.status === Status.Cancelling ? Status.Cancelled : Status.fromResult(state.result);
      const stoppedAt = convertTimestamp(state.stoppedAt) ?? null;

      task.status = status;
      task.stoppedAt = stoppedAt;
      await task.save({ transaction });

      // A finished task releases its ephemeral runner.
      if (status.isDone()) {
        await ActionRunnerModel.deleteEphemeralRunner(task.runnerId, transaction);
      }

      await ActionRunJobModel.update({ status, stoppedAt }, { where: { id: task.jobId }, transaction });
    } else {
      // Touch the updated timestamp so the task isn't judged as a zombie task.
      await this.update({}, { where: { id: task.id }, transaction });
    }

    await this.updateSteps(task, state.steps, transaction);

    return task;
  }

  /**
   * Write the reported step states back onto the step rows, matching them by index.
   *
   * Timestamps are written once: the reporter stamps the start on the first log line and
   * the stop when the step ends. A step the job never reached is marked finished by the
   * job-end sweep without a stop time, so one is filled in from `now`, as gitea does.
   */
  private static async updateSteps(task: ActionTask, stepStates: StepState[], transaction: Transaction) {
    const now = new Date();
    const states = new Map(stepStates.map((stepState) => [Number(stepState.id), stepState]));
    const steps = await ActionTaskStepModel.findAll({ where: { taskId: Number(task.id) }, transaction });

    for (const step of steps) {
      const stepState = states.get(step.index);
      const startedAt = stepState ? convertTimestamp(stepState.startedAt) : undefined;

      if (stepState) {
        step.logIndex = Number(stepState.logIndex);
        step.logLength = Number(stepState.logLength);

        // Prefer the start time the runner stamped itself over the moment its report
        // reached us. gitea records the server time here instead — a deliberate difference.
        if (!step.startedAt && startedAt) {
          step.startedAt = startedAt;
        }

        if (stepState.result !== Result.UNSPECIFIED) {
          step.status = Status.fromResult(stepState.result).toString();

          // A finished step should not be left without an end.
          if (!step.stoppedAt) {
            step.stoppedAt = convertTimestamp(stepState.stoppedAt) ?? now;
          }
        } else if (startedAt) {
          step.status = Status.Running.toString();
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await step.save({ transaction });
    }
  }

  /** Create one step row per step in the job's workflow, in workflow order. */
  private static async createSteps(task: ActionTask, job: ActionRunJob, transaction: Transaction) {
    const workflow = Workflow.Load(job.workflowPayload?.toString() ?? '');
    const steps = (workflow.jobs[job.jobId]?.steps?.toJSON() ?? []) as {
      name?: string;
      uses?: string;
      run?: string;
    }[];

    if (steps.length === 0) {
      return;
    }

    await ActionTaskStepModel.bulkCreate(
      steps.map((step, index) => ({
        name: (step.name || step.uses || step.run || `step-${index}`).slice(0, 255),
        taskId: Number(task.id),
        index,
        repositoryId: task.repositoryId,
        logIndex: 0,
        logLength: 0,
        status: Status.Waiting.toString(),
      })),
      { transaction },
    );
  }

  // public static async claimJobForRunner(runner: ActionRunner, job: ActionRunJob) {
  //   let resultTask: ActionTask | null = null;

  //   try {
  //     await sequelize.transaction(async (t) => {
  //       // 加载 job 关联
  //       if (typeof job.loadAttributes === 'function') {
  //         await job.loadAttributes(t);
  //       }
  //       // 解析 job 获取 steps
  //       const workflowJob = (await job.parseJob?.()) || { steps: [] };

  //       const now = new Date();
  //       // 创建 task
  //       const taskData = {
  //         jobID: job.id,
  //         attempt: job.attempt,
  //         runnerID: runner.id,
  //         started: now,
  //         status: Status.Running,
  //         repoID: job.repoID,
  //         ownerID: job.ownerID,
  //         commitSHA: job.commitSHA,
  //         isForkPullRequest: job.isForkPullRequest,
  //         // 其他字段默认
  //         logInStorage: false,
  //         logLength: 0,
  //         logSize: 0,
  //         logExpired: false,
  //       };
  //       const task = new ActionTask(taskData);
  //       task.generateAndFillToken();

  //       // 计算 logFilename
  //       const repoFullName = job.run?.repo?.fullName() || `repo_${job.repoID}`;
  //       task.logFilename = logFileName(repoFullName, 0); // task.id 尚未生成

  //       // 插入 task
  //       await task.save({ transaction: t });

  //       // 更新 logFilename 包含真正的 id
  //       task.logFilename = logFileName(repoFullName, task.id);
  //       await task.save({ fields: ['logFilename'], transaction: t });

  //       // 创建 steps
  //       if (workflowJob.steps && workflowJob.steps.length > 0) {
  //         const stepsData = workflowJob.steps.map((v: any, i: number) => ({
  //           name: makeTaskStepDisplayName(v, 255),
  //           taskID: task.id,
  //           index: i,
  //           repoID: task.repoID,
  //           status: Status.Waiting,
  //         }));
  //         const steps = await ActionTaskStepModel.bulkCreate(stepsData, { transaction: t });
  //         task.steps = steps as unknown as ActionTaskStep[];
  //       }

  //       // 更新 job 的 task_id 和状态（乐观锁）
  //       const [affectedCount] = await ActionRunJobModel.update(
  //         {
  //           taskID: task.id,
  //           status: Status.Running,
  //           started: now,
  //         },
  //         {
  //           where: {
  //             id: job.id,
  //             taskID: 0,
  //             status: Status.Waiting,
  //           },
  //           transaction: t,
  //         },
  //       );
  //       if (affectedCount !== 1) {
  //         // 被其他 runner 抢占了
  //         throw new Error('job already claimed by another runner');
  //       }

  //       // 将 job 关联到 task
  //       task.job = job;
  //       resultTask = task;
  //     });
  //   } catch (error: any) {
  //     if (error.message === 'job already claimed by another runner') {
  //       return { task: null as any, ok: false };
  //     }
  //     throw error;
  //   }
  //   return { task: resultTask!, ok: true };
  // }
}

ActionTask.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    runnerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    attempt: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    startedAt: DataTypes.DATE,
    stoppedAt: DataTypes.DATE,

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
      defaultValue: false,
    },
    token: {
      type: DataTypes.VIRTUAL,
      allowNull: false,
      defaultValue: generateToken,
      comment: 'task token',
    },
    tokenSalt: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: generateTokenSalt,
      comment: 'token salt',
    },
    tokenHash: {
      type: DataTypes.STRING,
    },
    tokenLastEight: {
      type: DataTypes.STRING,
    },
    logFilename: {
      type: DataTypes.STRING,
    },
    logInStorage: {
      type: DataTypes.BOOLEAN,
    },
    logLength: {
      type: DataTypes.INTEGER,
    },
    logSize: {
      type: DataTypes.INTEGER,
      comment: 'log size',
    },
    // logIndexes: DataTypes.INTEGER,
    logExpired: DataTypes.BOOLEAN,
  },
  {
    sequelize,
    indexes: [
      { name: 'idx_action_task_runner_id', fields: ['runner_id'] },
      { name: 'idx_action_task_status', fields: ['status'] },
      { name: 'idx_action_task_started', fields: ['started_at'] },
      { name: 'idx_action_task_repo_id', fields: ['repository_id'] },
      { name: 'idx_action_task_owner_id', fields: ['owner_id'] },
      { name: 'idx_action_task_commit_sha', fields: ['commit_sha'] },
      { name: 'idx_token_last_eight_status', fields: ['token_last_eight', 'status'] },
      { name: 'stopped_log_expired', fields: ['stopped_at', 'log_expired'] },
    ],
  },
);

ActionTask.beforeCreate((model) => {
  model.tokenHash = hashToken(model.token, model.tokenSalt);
  model.tokenLastEight = model.token.slice(-8);
});
