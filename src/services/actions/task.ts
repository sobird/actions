import { create } from '@bufbuild/protobuf';
import { Op, type Transaction } from 'sequelize';

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
      result: ActionRunJob.aggregateJobStatus(needJobs).asResult(),
      outputs,
    });
  }

  return create(TaskSchema, {
    id: BigInt(task.id!),
    workflowPayload: Buffer.from(workflowPayload),
    context,
    secrets: {},
    needs,
    vars: {},
  });
}

/** The dependency fields the resolution reads. */
export interface DependencyJob {
  jobId: string;
  status: Status;
  continueOnError: boolean;
}

/**
 * A cell that failed for real, which is what its dependents react to.
 *
 * A failure with continue-on-error is treated as a success, matching AggregateJobStatus.
 */
function failedForReal(dependency: DependencyJob): boolean {
  return !dependency.status.isSuccess() && !(dependency.continueOnError && dependency.status.isFailure());
}

/**
 * Whether the jobs named by `needs` let the depending job start.
 *
 * A job expands into one run job per matrix cell, so a dependency only counts as
 * done once every cell of it is done, and as failed only when a cell failed for
 * real. Mirrors gitea's `jobStatusResolver.resolveCheckNeeds`.
 */
export function resolveNeeds(needs: string[], dependencies: DependencyJob[]): 'pending' | 'failed' | 'ready' {
  const dependencyIds = new Set(dependencies.map((dependency) => dependency.jobId));
  // A job that is not in the run at all can never finish, and neither can a cell
  // that has not been inserted yet.
  if (needs.some((needId) => !dependencyIds.has(needId))) {
    return 'pending';
  }
  if (!dependencies.every((dependency) => dependency.status.isDone())) {
    return 'pending';
  }

  return dependencies.some(failedForReal) ? 'failed' : 'ready';
}

/**
 * Hand every blocked job of a run the state its dependencies leave it in.
 *
 * Mirrors the needs half of gitea's `job_emitter`: a blocked job whose dependency
 * cells are all done and successful becomes waiting, and one that depends on a cell
 * that failed for real is skipped, so it leaves the queue instead of staying blocked
 * forever. Returns whether any of them is waiting now.
 */
export async function resolveBlockedJobs(runId: number, transaction?: Transaction): Promise<boolean> {
  const jobs = await ActionRunJob.findAll({ where: { runId }, transaction });
  const blockedJobs = jobs.filter((job) => job.status.isBlocked());
  if (blockedJobs.length === 0) {
    return false;
  }

  // A job can only be decided once the jobs it depends on are decided, and a
  // workflow declares them in no particular order, so repeat until a pass settles
  // nothing: each pass carries the statuses it wrote in memory into the next one.
  const decided = new Set<number>();
  while (decided.size < blockedJobs.length) {
    let settled = 0;

    for (const job of blockedJobs) {
      if (decided.has(Number(job.id))) {
        continue;
      }

      // Only the cells of the jobs named by `needs` are read: a blocked job is not a
      // dependency of anything, and letting it into the pool would keep every
      // dependent pending forever.
      const needs = parseStringList(job.needs);
      const dependencies = jobs.filter((candidate) => needs.includes(candidate.jobId));

      const verdict = resolveNeeds(needs, dependencies);
      if (verdict === 'pending') {
        continue;
      }

      job.status = verdict === 'failed' ? Status.Skipped : Status.Waiting;
      decided.add(Number(job.id));
      settled += 1;
    }

    if (settled === 0) {
      break;
    }
  }

  let waiting = 0;
  for (const job of blockedJobs) {
    if (job.status.isBlocked()) {
      continue;
    }

    // One job per write, guarded by the status this pass read: a concurrent writer that
    // already decided it is not overwritten. Every write carries the aggregate along.
    // eslint-disable-next-line no-await-in-loop
    const affected = await ActionRunJob.updateRunJob(
      job,
      { status: job.status },
      { status: Status.Blocked.toString() },
      transaction,
    );
    if (affected !== 1) {
      throw new Error(`no affected for updating blocked job ${job.id}`);
    }
    if (job.status.isWaiting()) {
      waiting += 1;
    }
  }

  return waiting > 0;
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
    cursor = { updatedAt: last.updatedAt, id: Number(last.id) };
  }
}
