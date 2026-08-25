/**
 * Actions Task Model
 *
 * sobird<i@sobird.me> at 2024/11/23 12:21:49 created.
 */

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
} from 'sequelize';

import { sequelize, BaseModel } from '@/lib/sequelize';

import type { Models, ActionRunJob, ActionRunner, ActionTaskStep } from '.';
import { Status } from './status';

export type ActionTaskCreationAttributes = CreationAttributes<ActionTask>;

export class ActionTask extends BaseModel<InferAttributes<ActionTask>, InferCreationAttributes<ActionTask>> {
  declare jobId: number;
  declare runnerId: bigint;
  declare attempt: CreationOptional<number>;
  declare status: CreationOptional<Status>;
  declare started: CreationOptional<Date>;
  declare stopped: CreationOptional<Date>;
  declare repositoryId: number;
  declare ownerId: number;
  declare commitSha: string;
  declare isForkPullRequest: CreationOptional<boolean>;
  declare tokenHash: CreationOptional<string>;
  declare tokenSalt: CreationOptional<string>;
  declare tokenLastEight: CreationOptional<string>;
  declare logFilename: string;
  declare logInStorage: boolean;
  declare logLength: number;
  declare logSize: number;
  // declare logIndexes: number;
  declare logExpired: boolean;

  declare job?: NonAttribute<ActionRunJob>;
  declare steps?: NonAttribute<ActionTaskStep[]>;

  static associate({ ActionRunJob, ActionRunner, ActionTaskStep }: Models) {
    this.belongsTo(ActionRunJob, { as: 'job', foreignKey: 'jobId' });
    this.belongsTo(ActionRunner, { as: 'runner', foreignKey: 'runnerId' });
    this.hasMany(ActionTaskStep, { as: 'steps', foreignKey: 'taskId' });
  }

  declare static associations: {
    Job: Association<ActionTask, ActionRunJob>;
  };

  // associates method
  // Since TS cannot determine model association at compile time
  // we have to declare them here purely virtually
  // these will not exist until `Model.init` was called.
  declare getActionTaskSteps: HasManyGetAssociationsMixin<ActionTaskStep>;
  /** Remove all previous associations and set the new ones */
  declare setActionTaskSteps: HasManySetAssociationsMixin<ActionTaskStep, bigint>;
  declare addActionTaskStep: HasManyAddAssociationMixin<ActionTaskStep, bigint>;
  declare addActionTaskSteps: HasManyAddAssociationsMixin<ActionTaskStep, bigint>;
  declare removeActionTaskStep: HasManyRemoveAssociationMixin<ActionTaskStep, bigint>;
  declare removeActionTaskSteps: HasManyRemoveAssociationsMixin<ActionTaskStep, bigint>;
  declare hasActionTaskStep: HasManyHasAssociationMixin<ActionTaskStep, bigint>;
  declare hasActionTaskSteps: HasManyHasAssociationsMixin<ActionTaskStep, bigint>;
  declare createActionTaskStep: HasManyCreateAssociationMixin<ActionTaskStep>;
  declare countActionTaskSteps: HasManyCountAssociationsMixin;

  // ActionRunJob
  declare getActionRunJob: BelongsToGetAssociationMixin<ActionRunJob>;
  declare setActionRunJob: BelongsToSetAssociationMixin<ActionRunJob, bigint>;
  declare createActionRunJob: BelongsToCreateAssociationMixin<ActionRunJob>;

  // ActionRunner
  declare getActionRunner: BelongsToGetAssociationMixin<ActionRunner>;
  declare setActionRunner: BelongsToSetAssociationMixin<ActionRunner, bigint>;
  declare createActionRunner: BelongsToCreateAssociationMixin<ActionRunner>;

  public static async createForRunner(_runner: ActionRunner) {
    // const t = await sequelize.transaction();
    // const { ownerId, repositoryId } = runner;

    // const jobs = this

    return this.create();
  }

  public static async releaseTaskForRunner(task: ActionTask) {
    // todo
    console.log('task', task);
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
    started: DataTypes.DATE,
    stopped: DataTypes.DATE,

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
    tokenHash: {
      type: DataTypes.STRING,
    },
    tokenSalt: {
      type: DataTypes.STRING,
    },
    tokenLastEight: {
      type: DataTypes.STRING,
    },
    logFilename: DataTypes.STRING,
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
      { name: 'idx_action_task_started', fields: ['started'] },
      { name: 'idx_action_task_repo_id', fields: ['repository_id'] },
      { name: 'idx_action_task_owner_id', fields: ['owner_id'] },
      { name: 'idx_action_task_commit_sha', fields: ['commit_sha'] },
      { name: 'idx_token_last_eight_status', fields: ['token_last_eight', 'status'] },
      { name: 'stopped_log_expired', fields: ['stopped', 'log_expired'] },
    ],
  },
);
