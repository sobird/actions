import { create } from '@bufbuild/protobuf';

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

  const needs: Record<string, TaskNeed> = {};
  for (const needId of parseStringList(job.needs)) {
    // eslint-disable-next-line no-await-in-loop
    const needJob = await ActionRunJob.findOne({ where: { runId: job.runId, jobId: needId } });
    if (!needJob) {
      continue;
    }

    const outputs: Record<string, string> = {};
    if (needJob.taskId) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await ActionTaskOutput.findAll({ where: { taskId: needJob.taskId } });
      rows.forEach((row) => {
        outputs[row.outputKey] = row.outputValue;
      });
    }

    needs[needId] = create(TaskNeedSchema, {
      result: needJob.status.asResult(),
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

/**
 * Whether every job this one depends on has finished successfully.
 *
 * A failed dependency is terminal: the job is marked skipped so it leaves the
 * queue instead of being retried forever.
 */
async function needsSatisfied(job: ActionRunJob): Promise<boolean> {
  const needs = parseStringList(job.needs);
  if (needs.length === 0) {
    return true;
  }

  const dependencies = await ActionRunJob.findAll({ where: { runId: job.runId, jobId: needs } });
  if (dependencies.length !== needs.length) {
    return false;
  }
  if (!dependencies.every((dependency) => dependency.status.isDone())) {
    return false;
  }

  if (!dependencies.every((dependency) => dependency.status.isSuccess())) {
    await job.update({ status: Status.Skipped, stopped: new Date() });
    return false;
  }

  return true;
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

  // 2. 按标签与依赖挑一个已入队但尚未被认领的 job
  const jobs = await ActionRunJob.findAll({
    where: { taskId: 0, status: Status.Waiting.toString() },
    order: [['id', 'ASC']],
  });

  for (const job of jobs) {
    if (!runner.canMatchLabels(parseStringList(job.runsOn))) {
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    if (!(await needsSatisfied(job))) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // 3. 抢占 job 并落库 task
    // eslint-disable-next-line no-await-in-loop
    const task = await ActionTask.createForRunner(runner, job);
    if (!task) {
      // 被其他 runner 抢占了，继续尝试下一个 job
      // eslint-disable-next-line no-continue
      continue;
    }

    // 4. 装配 Task 载荷
    try {
      // eslint-disable-next-line no-await-in-loop
      return { task: await buildRunnerTask(task) };
    } catch (err) {
      // 【核心补偿逻辑】：Job 已经被抢占锁定，但组装 Payload 失败了。
      // 必须立刻释放锁定，让 Job 回到等待队列，否则该 Job 将死锁在 running 状态。
      try {
        // eslint-disable-next-line no-await-in-loop
        await ActionTask.releaseTaskForRunner(task);
      } catch (relErr) {
        const relMsg = relErr instanceof Error ? relErr.message : String(relErr);
        console.error(`ReleaseTaskForRunner [task_id: ${task.id}]: ${relMsg}`);
      }
      throw err; // 继续向上抛出组装失败的原始错误
    }
  }

  return null;
}
