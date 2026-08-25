import { Task } from '@/gen/runner/v1/messages_pb.ts';
import { ActionRunner, ActionTask } from '@/models';
import { Status } from '@/models/actions/status';

async function buildRunnerTask(task: ActionTask) {
  console.log('task', task);

  return {
    task: {} as Task,
    job: task.job,
  };
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
    let task = await ActionTask.findOne({
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

  // 2. 尝试在数据库中为 Runner 创建/锁定一个任务
  // 对应 Go 的: t, ok, err := actions_model.CreateTaskForRunner(...)
  let t: ActionTask | null = null;
  const task = await ActionTask.createForRunner(runner);
  if (!task) {
    return null; // 没有可领的任务
  }
  t = task;

  // 3. 装配 Task 载荷
  let taskPayload: any;
  // let job: ActionRunJob;

  try {
    const buildResult = await buildRunnerTask(t);
    taskPayload = buildResult.task;
    // job = buildResult.job;
  } catch (err) {
    // 【核心补偿逻辑】：Job 已经被抢占锁定，但组装 Payload 失败了。
    // 必须立刻释放锁定，让 Job 回到等待队列，否则该 Job 将死锁在 running 状态。
    try {
      await ActionTask.releaseTaskForRunner(t);
    } catch (relErr) {
      const relMsg = relErr instanceof Error ? relErr.message : String(relErr);
      console.error(`ReleaseTaskForRunner [task_id: ${t.id}]: ${relMsg}`);
    }
    throw err; // 继续向上抛出组装失败的原始错误
  }

  // const actionTask = t;

  // 4. 触发后续的各种状态更新通知（非阻塞/或顺序执行取决于业务，这里采用 await）
  // await createCommitStatusForRunJobs(ctx, job.run, job);
  // await notifyWorkflowJobStatusUpdateWithTask(ctx, job, actionTask);

  // // job.run 在事务内部加载，如果 started 为空（或零值），代表这是该 Run 的第一次认领
  // if (!job.run.started || job.run.started.getTime() === 0) {
  //   await notifyWorkflowRunStatusUpdateWithReload(ctx, job.repoID, job.runID);
  // }

  return { task: taskPayload };
}
