import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';

import { Result, StepStateSchema, TaskStateSchema } from '@/gen/runner/v1/messages_pb';
import { ActionRun, ActionRunAttempt, ActionRunJob, ActionRunner, ActionTask, ActionTaskStep } from '@/models/actions';

import type { ActionRunJobCreationAttributes } from './run_job';
import { Status } from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run');
vi.mock('./task');
vi.mock('./task_step');
vi.mock('./runner');
vi.mock('./run_job');
vi.mock('./run_attempt');

/** queueJob 把 job 都挂在 800 号 run 下；认领要顺手刷新 run 的状态，所以这行 run 得在 */
const RUN_ID = 800;

/** 800 号 run 的那次 attempt：job 必填归属，状态也沿它冒泡 */
let ATTEMPT_ID: number;

/** 每个 job 在它那次 attempt 里领一个序号，口径同 createRun */
let nextAttemptJobId = 1;

beforeAll(async () => {
  await ActionRun.create({
    id: RUN_ID,
    title: 'createForRunner',
    ownerId: 1,
    repositoryId: 4,
    workflowId: 'test',
    index: 800,
    ref: 'refs/heads/master',
    commitSha: '',
    eventName: 'workflow_dispatch',
    status: Status.Waiting,
  });

  const attempt = await ActionRunAttempt.create({
    runId: RUN_ID,
    repositoryId: 4,
    attempt: 1,
    triggerUserId: 0,
    status: Status.Waiting,
    concurrencyGroup: '',
    concurrencyCancel: false,
  });
  ATTEMPT_ID = attempt.id;
  await ActionRun.update({ latestAttemptId: attempt.id }, { where: { id: RUN_ID } });
});

/** 一个 job 的 workflow：分别只有 name / uses / run 的三个 step */
const WORKFLOW_PAYLOAD = `
jobs:
  job_2:
    runs-on: ubuntu-latest
    steps:
      - name: say hello
        run: echo hello
      - uses: actions/checkout@v4
      - run: echo from run
`;

/** 入队一个还没被认领的 job：`taskId: 0` + waiting 就是它在队列里的标志 */
function queueJob(overrides: Partial<ActionRunJobCreationAttributes> = {}) {
  return ActionRunJob.create({
    runId: RUN_ID,
    runAttemptId: ATTEMPT_ID,
    attemptJobId: nextAttemptJobId++,
    repositoryId: 4,
    ownerId: 1,
    name: 'job_2',
    commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
    isForkPullRequest: true,
    attempt: 2,
    workflowPayload: Buffer.from(WORKFLOW_PAYLOAD),
    jobId: 'job_2',
    taskId: 0,
    status: Status.Waiting,
    startedAt: null,
    stoppedAt: null,
    ...overrides,
  });
}

describe('ActionTask.createForRunner', () => {
  it('claims a waiting job and materializes it as a task', async () => {
    const runner = (await ActionRunner.findByPk(1))!;
    const job = await queueJob();

    const task = await ActionTask.createForRunner(runner, job);

    expect(task).not.toBeNull();
    // task 复制了 job 的身份信息，而不是自己另取一份
    expect(task!.jobId).toBe(job.id);
    expect(task!.runnerId).toBe(runner.id);
    expect(task!.attempt).toBe(2);
    expect(task!.isForkPullRequest).toBe(true);
    expect(task!.commitSha).toBe(job.commitSha);
    expect(task!.repositoryId).toBe(job.repositoryId);
    expect(task!.status).toBe(Status.Running);
    expect(task!.logInStorage).toBe(false);
    expect(task!.logExpired).toBe(false);

    // logFilename 里嵌的是插入之后才拿到的真实 id
    const [, shard, logId] = task!.logFilename.match(/^artifact-repo_4\/([0-9a-f]{2})\/(\d+)\.log$/)!;
    expect(Number(logId)).toBe(task!.id);
    expect(Number.parseInt(shard, 16)).toBe(task!.id & 0xff);

    // job 被乐观更新：认领后指向新 task 并进入 running
    await job.reload();
    expect(job.taskId).toBe(task!.id);
    expect(job.status).toBe(Status.Running);
    expect(job.startedAt).not.toBeNull();

    expect(task!.job).toBe(job);
  });

  it('creates one task step per workflow step, in workflow order', async () => {
    const runner = (await ActionRunner.findByPk(1))!;
    const job = await queueJob();

    const task = await ActionTask.createForRunner(runner, job);
    const steps = await task!.getSteps({ order: [['index', 'ASC']] });

    // 有 name 用 name，没有的按 gitea 的规则取 "Run " + 第一条命令（没有命令就是 uses）
    expect(steps.map((step) => step.name)).toEqual(['say hello', 'Run actions/checkout@v4', 'Run echo from run']);
    expect(steps.map((step) => step.index)).toEqual([0, 1, 2]);
    expect(steps.map((step) => step.status)).toEqual(['waiting', 'waiting', 'waiting']);
    expect(steps.map((step) => step.taskId)).toEqual(Array(3).fill(task!.id));
  });

  it('returns null and leaves no orphan task when another runner already claimed the job', async () => {
    const runner = (await ActionRunner.findByPk(1))!;
    const job = await queueJob({ taskId: 47, status: Status.Running, startedAt: new Date() });

    expect(await ActionTask.createForRunner(runner, job)).toBeNull();

    // 抢输了的那次事务整体回滚，不留下半成品
    expect(await ActionTask.count({ where: { jobId: job.id } })).toBe(0);
    await job.reload();
    expect(job.taskId).toBe(47);
  });

  it('rolls the claim back when the workflow payload cannot be loaded', async () => {
    const runner = (await ActionRunner.findByPk(1))!;
    const job = await queueJob({ workflowPayload: Buffer.from('') });

    await expect(ActionTask.createForRunner(runner, job)).rejects.toThrow();

    expect(await ActionTask.count({ where: { jobId: job.id } })).toBe(0);
    await job.reload();
    expect(job.taskId).toBe(0);
    expect(job.status).toBe(Status.Waiting);
  });
});

describe('ActionTask.releaseTaskForRunner', () => {
  it('puts the job back in the waiting queue and drops the task with its steps', async () => {
    const runner = (await ActionRunner.findByPk(1))!;
    const job = await queueJob();
    const task = (await ActionTask.createForRunner(runner, job))!;
    const taskId = task.id;

    await ActionTask.releaseTaskForRunner(task);

    await job.reload();
    expect(job.taskId).toBe(0);
    expect(job.status).toBe(Status.Waiting);
    expect(job.startedAt).toBeNull();
    expect(await ActionTask.findByPk(taskId)).toBeNull();
    expect(await ActionTaskStep.count({ where: { taskId } })).toBe(0);
  });
});

describe('ActionTask.updateByState', () => {
  /** 认领一个全新的 job，让每个用例独占自己的 task / job 行 */
  async function runningTask() {
    const job = await queueJob();
    const runner = (await ActionRunner.findByPk(1))!;
    return { job, runner, task: (await ActionTask.createForRunner(runner, job))! };
  }

  it('writes the final result onto the task and its job at once', async () => {
    const { job, task } = await runningTask();
    const stoppedAt = new Date(1683636700000);

    const updated = await ActionTask.updateByState(
      1,
      create(TaskStateSchema, {
        id: BigInt(task.id),
        result: Result.FAILURE,
        stoppedAt: timestampFromDate(stoppedAt),
      }),
    );

    expect(updated.status).toBe(Status.Failure);
    expect(updated.stoppedAt).toEqual(stoppedAt);

    await job.reload();
    expect(job.status).toBe(Status.Failure);
    expect(job.stoppedAt).toEqual(stoppedAt);
  });

  it('keeps the cancellation the user asked for when the runner reports a cleanup result', async () => {
    const { task } = await runningTask();
    task.status = Status.Cancelling;
    await task.save();

    const updated = await ActionTask.updateByState(
      1,
      create(TaskStateSchema, { id: BigInt(task.id), result: Result.SUCCESS }),
    );

    expect(updated.status).toBe(Status.Cancelled);
  });

  it('ignores a report for a task that already reached a final state', async () => {
    const { task } = await runningTask();
    const stoppedAt = new Date(1683636700000);
    task.status = Status.Success;
    task.stoppedAt = stoppedAt;
    await task.save();

    const updated = await ActionTask.updateByState(
      1,
      create(TaskStateSchema, {
        id: BigInt(task.id),
        result: Result.FAILURE,
        stoppedAt: timestampFromDate(new Date()),
      }),
    );

    expect(updated.status).toBe(Status.Success);
    expect(updated.stoppedAt).toEqual(stoppedAt);
  });

  it('maps an in-flight report onto the step rows by index and leaves the others alone', async () => {
    const { task } = await runningTask();
    const startedAt = new Date(1683636528000);

    const updated = await ActionTask.updateByState(
      1,
      create(TaskStateSchema, {
        id: BigInt(task.id),
        steps: [
          create(StepStateSchema, {
            id: BigInt(1),
            logIndex: BigInt(12),
            logLength: BigInt(34),
            startedAt: timestampFromDate(startedAt),
          }),
        ],
      }),
    );

    expect(updated.status).toBe(Status.Running);

    const steps = await task.getSteps({ order: [['index', 'ASC']] });
    expect(steps.map((step) => step.status)).toEqual(['waiting', 'running', 'waiting']);
    expect(steps[1].logIndex).toBe(12);
    expect(steps[1].logLength).toBe(34);
    expect(steps[1].startedAt).toEqual(startedAt);
    // 还在跑的步骤不该有结束时间
    expect(steps[1].stoppedAt).toBeNull();
  });

  it('gives a finished step a stop time when the report leaves it out', async () => {
    const { task } = await runningTask();

    // job 结束时没跑到的步骤就是这样上报的：有终态，没有 stoppedAt
    const updated = await ActionTask.updateByState(
      1,
      create(TaskStateSchema, {
        id: BigInt(task.id),
        steps: [create(StepStateSchema, { id: BigInt(2), result: Result.CANCELLED })],
      }),
    );

    const steps = await updated.getSteps({ order: [['index', 'ASC']] });
    expect(steps[2].status).toBe(Status.Cancelled.toString());
    expect(steps[2].stoppedAt).toBeInstanceOf(Date);
  });

  it('keeps the stop time a step already carries', async () => {
    const { task } = await runningTask();
    const stoppedAt = new Date(1683636626000);
    const step = (await ActionTaskStep.findOne({ where: { taskId: task.id, index: 0 } }))!;
    step.stoppedAt = stoppedAt;
    await step.save();

    await ActionTask.updateByState(
      1,
      create(TaskStateSchema, {
        id: BigInt(task.id),
        steps: [
          create(StepStateSchema, {
            id: BigInt(0),
            result: Result.SUCCESS,
            stoppedAt: timestampFromDate(new Date(1750000000000)),
          }),
        ],
      }),
    );

    await step.reload();
    expect(step.stoppedAt).toEqual(stoppedAt);
  });

  it('rejects a state reported by another runner', async () => {
    const { task } = await runningTask();

    await expect(ActionTask.updateByState(2, create(TaskStateSchema, { id: BigInt(task.id) }))).rejects.toThrow(
      'invalid runner for task',
    );
  });

  it('rejects a state for a task that does not exist', async () => {
    await expect(ActionTask.updateByState(1, create(TaskStateSchema, { id: BigInt(404) }))).rejects.toThrow(
      'not exist',
    );
  });
});
