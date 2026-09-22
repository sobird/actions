import { create } from '@bufbuild/protobuf';
import { Op } from 'sequelize';

import { Task, TaskNeed, TaskNeedSchema, TaskSchema } from '@/gen/runner/v1/messages_pb';
import { ActionRun, ActionRunJob, ActionRunner, ActionTask, ActionTaskOutput } from '@/models';
import { Status } from '@/models/actions/status';
import Workflow from '@/workflow';

import { parseStringList } from './createRun';

/**
 * Assemble the payload a runner needs to execute a claimed task.
 *
 * The workflow yaml travels with the task, so the runner never has to ask the
 * server for the workflow again.
 */
async function buildRunnerTask(task: ActionTask): Promise<Task> {
  const job = task.job ?? (await ActionRunJob.findByPk(task.jobId));
  if (!job) {
    throw new Error(`task ${task.id}: job ${task.jobId} not found`);
  }

  const run = await ActionRun.findByPk(job.runId);
  const workflowPayload = job.workflowPayload?.toString() ?? '';
  const workflow = Workflow.Load(workflowPayload);

  // The local checkout the steps run in; the runner reads it from
  // `context.repository`.
  const workdir = run?.eventPayload ? (JSON.parse(run.eventPayload).workdir ?? '') : '';

  const context = {
    event_name: run?.eventName ?? 'workflow_dispatch',
    job: job.jobId,
    ref: run?.ref ?? '',
    sha: run?.commitSha ?? '',
    run_id: String(run?.id ?? ''),
    run_number: String(run?.index ?? ''),
    run_attempt: String(task.attempt ?? 1),
    actor: 'actions',
    triggering_actor: 'actions',
    workflow: workflow.name || workflow.file || '',
    server_url: 'https://github.com',
    repository: workdir,
    workspace: workdir,
    repository_id: String(job.repositoryId),
    repository_owner: '',
  };

  // A needed job is one run job per matrix cell, so its result is the aggregate
  // of its cells and its outputs are the merge of theirs.
  const needs: Record<string, TaskNeed> = {};
  for (const needId of parseStringList(job.needs)) {
    // eslint-disable-next-line no-await-in-loop
    const needJobs = await ActionRunJob.findAll({ where: { runId: job.runId, jobId: needId } });
    if (needJobs.length === 0) {
      continue;
    }

    const outputs: Record<string, string> = {};
    for (const needJob of needJobs) {
      if (!needJob.status.isDone() || !needJob.taskId) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const rows = await ActionTaskOutput.findAll({ where: { taskId: needJob.taskId } });
      rows.forEach((row) => {
        outputs[row.outputKey] = row.outputValue;
      });
    }

    needs[needId] = create(TaskNeedSchema, {
      result: ActionRunJob.aggregateStatus(needJobs).asResult(),
      outputs,
    });
  }

  return create(TaskSchema, {
    id: BigInt(task.id),
    workflowPayload: Buffer.from(workflowPayload),
    context,
    secrets: {},
    needs,
    vars: {},
  });
}

/** The where-clause fields that limit a runner to the jobs it may pick. */
type JobScope = { repositoryId?: number; ownerId?: number };

/** Where the previous page of the waiting-job scan stopped. */
interface PickCursor {
  updatedAt: Date;
  id: number;
}

/** How many waiting jobs one scan page loads, so a large backlog is not read into memory per poll. */
const PickTaskBatchSize = 100;

/**
 * The jobs a runner may pick, scoped the way gitea scopes them in `CreateTaskForRunner`:
 * a repo runner only its own repository, an owner runner everything the owner has, and a
 * global runner anything at all.
 *
 * gitea resolves the owner tier through `repository` joined to `repo_unit`; this codebase
 * has neither table, but every job carries the owner of its repository, which is what the
 * join filters on.
 */
export function runnerJobScope(runner: ActionRunner): JobScope {
  if (runner.repositoryId > 0) {
    return { repositoryId: runner.repositoryId };
  }
  if (runner.ownerId > 0) {
    return { ownerId: runner.ownerId };
  }
  return {};
}

/**
 * One page of the waiting, unclaimed jobs a runner may pick, oldest first.
 *
 * Keyset pagination on (updatedAt, id) stays correct while other runners claim jobs
 * concurrently: `updatedAt` only moves forward, so the advancing cursor never steps over
 * a job that is still waiting even as claimed jobs drop out of the result.
 */
export async function findWaitingJobs(scope: JobScope, cursor?: PickCursor, limit = PickTaskBatchSize) {
  const base = { ...scope, taskId: 0, status: Status.Waiting.toString() };
  const where = cursor
    ? {
        ...base,
        [Op.or]: [
          { updatedAt: { [Op.gt]: cursor.updatedAt } },
          { updatedAt: cursor.updatedAt, id: { [Op.gt]: cursor.id } },
        ],
      }
    : base;

  return ActionRunJob.findAll({
    where,
    order: [
      ['updatedAt', 'ASC'],
      ['id', 'ASC'],
    ],
    limit,
  });
}

/**
 * 尝试为指定的 Runner 认领并构建一个任务
 * @returns 成功认领返回 { task }，若当前无可领任务或 Runner 被禁用则返回 null
 * @throws 数据库错误或构建失败时抛出 Error
 */
export async function pickTask(runner: ActionRunner) {
  if (runner.isDisabled) {
    return null;
  }

  // 1. 处理短暂/一次性 Runner (Ephemeral) 的特殊生命周期
  if (runner.ephemeral) {
    const task = await ActionTask.findOne({
      where: {
        runnerId: runner.id,
      },
    });

    if (task) {
      const activeStatuses = [Status.Waiting, Status.Running, Status.Blocked, Status.Cancelling];
      if (activeStatuses.includes(task.status)) {
        return null;
      }

      // 任务已完成，移除该 Ephemeral Runner
      await ActionRunner.destroy({
        where: {
          id: runner.id,
        },
      });
      throw new Error('runner has been removed');
    }
  }

  // 2. 翻页扫过该 runner 能领的 waiting job，逐页认领，直到翻完或认领成功
  const scope = runnerJobScope(runner);
  let cursor: PickCursor | undefined;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const jobs = await findWaitingJobs(scope, cursor);
    if (jobs.length === 0) {
      return null;
    }

    for (const job of jobs) {
      if (!runner.canMatchLabels(parseStringList(job.runsOn))) {
        // eslint-disable-next-line no-continue
        continue;
      }

      let task: ActionTask | null = null;
      try {
        // 3. 抢占 job 并落库 task
        // eslint-disable-next-line no-await-in-loop
        task = await ActionTask.createForRunner(runner, job);
        if (!task) {
          // 被其他 runner 抢占了，继续尝试下一个 job
          // eslint-disable-next-line no-continue
          continue;
        }

        // 4. 装配 Task 载荷
        // eslint-disable-next-line no-await-in-loop
        return { task: await buildRunnerTask(task) };
      } catch (err) {
        // 【核心补偿逻辑】：Job 已经被抢占锁定，但组装 Payload 失败了。
        // 必须立刻释放锁定，让 Job 回到等待队列，否则该 Job 将死锁在 running 状态。
        if (task) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await ActionTask.releaseTaskForRunner(task);
          } catch (relErr) {
            const relMsg = relErr instanceof Error ? relErr.message : String(relErr);
            console.error(`ReleaseTaskForRunner [task_id: ${task.id}]: ${relMsg}`);
          }
        }

        // 单个坏 job 不该让整个 runner 队列失效：记日志后换下一个候选。
        // 代价是数据库级故障也只会表现为「这次没任务」，下一轮轮询会重试。
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[pickTask] job ${job.id}: ${message}`);
      }
    }

    // 翻不满一页说明后面没有 waiting job 了。
    if (jobs.length < PickTaskBatchSize) {
      return null;
    }

    const last = jobs[jobs.length - 1];
    cursor = { updatedAt: last.updatedAt, id: last.id };
  }
}
