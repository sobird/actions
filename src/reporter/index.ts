/**
 * 任务状态&日志 报告器 向Runner所属的服务器实例报告日志
 *
 * sobird<i@sobird.me> at 2024/04/26 0:19:33 created.
 */
import util from 'node:util';

import { create, clone } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { Mutex } from 'async-mutex';
import retry from 'async-retry';

import logger, { LoggerHook, LogEntry } from '@/common/logger';
import type { RunnerServiceClient } from '@/gen';
import {
  LogRow,
  LogRowSchema,
  Task,
  TaskSchema,
  TaskState,
  TaskStateSchema,
  StepState,
  StepStateSchema,
  Result,
  UpdateLogRequestSchema,
  UpdateTaskRequestSchema,
} from '@/gen/runner/v1/messages_pb';

const stringToResult: any = {
  success: Result.SUCCESS,
  failure: Result.FAILURE,
  skipped: Result.SKIPPED,
  cancelled: Result.CANCELLED,
};

class Reporter implements LoggerHook {
  private state: TaskState;
  private outputs = new Map<string, string>();
  private logOffset = BigInt(0);
  private logRows = <LogRow[]>[];
  private closed = false;

  private clientMutex = new Mutex();
  private daemonTimer?: NodeJS.Timeout;
  private abortController = new AbortController();

  constructor(
    public client: RunnerServiceClient,
    public task: Task = create(TaskSchema),
  ) {
    this.state = create(TaskStateSchema, {
      id: task.id,
    });
  }

  /**
   * 重置步骤状态
   */
  resetSteps(count: number): void {
    this.state.steps = [];
    for (let i = 0; i < count; i++) {
      this.state.steps.push(
        create(StepStateSchema, {
          id: BigInt(i),
        }),
      );
    }
  }

  /**
   * 用于在日志条目被创建时执行额外的操作。
   * 该方法更新了任务状态，处理了日志行，并在必要时更新了步骤信息
   * @param entry
   */
  fire(entry: LogEntry) {
    // 使用提供的日志条目
    // logger.verbose(entry);

    const timestamp = timestampFromDate(new Date(entry.timestamp));

    if (!this.state.startedAt) {
      this.state.startedAt = timestamp;
    }

    // 更新任务状态
    const { stage } = entry;
    if (stage !== 'Main') {
      // 处理作业结果
      const jobResult = Reporter.parseResult(entry.jobResult);
      if (jobResult !== undefined) {
        this.state.result = jobResult;
        this.state.stoppedAt = timestamp;
        this.state.steps.map((item) => {
          const step = item;
          if (step.result === Result.UNSPECIFIED) {
            // 与 act_runner 对齐：job 结束时未跑到的步骤标记为 CANCELLED
            step.result = Result.CANCELLED;
            if (jobResult === Result.SKIPPED) {
              step.result = Result.SKIPPED;
            }
          }
          return step;
        });
      }

      // 检查是否在步骤执行期间
      if (!this.duringSteps()) {
        // 如果不是，将日志行添加到日志行列表中
        const logRow = this.parseLogRow(entry);
        if (logRow) {
          this.logRows.push(logRow);
        }
      }
      return;
    }

    // 处理步骤信息
    let step: StepState | undefined;
    const stepNumber = parseInt(entry.stepNumber ?? '0', 10);
    if (Number.isInteger(stepNumber) && this.state.steps.length > stepNumber) {
      step = this.state.steps[stepNumber];
    }

    if (!step) {
      if (!this.duringSteps()) {
        // 如果不是，将日志行添加到日志行列表中
        const logRow = this.parseLogRow(entry);
        if (logRow) {
          this.logRows.push(logRow);
        }
      }
      return;
    }

    if (!step.startedAt) {
      step.startedAt = timestamp;
    }

    const verbatim = entry.verbatim;
    if (verbatim) {
      const logRow = this.parseLogRow(entry);
      if (logRow) {
        if (step.logLength === BigInt(0)) {
          step.logIndex = this.logOffset + BigInt(this.logRows.length);
        }
        step.logLength += BigInt(1);
        this.logRows.push(logRow);
      }
    } else if (!this.duringSteps()) {
      const logRow = this.parseLogRow(entry);
      if (logRow) {
        this.logRows.push(logRow);
      }
    }

    // 检查步骤结果
    const stepResult = Reporter.parseResult(entry.stepResult);
    if (stepResult !== undefined && step) {
      if (step.logLength === BigInt(0)) {
        step.logIndex = this.logOffset + BigInt(this.logRows.length);
      }
      step.result = stepResult;
      step.stoppedAt = timestamp;
    }
  }

  async runDaemon() {
    if (this.closed) {
      return;
    }

    if (this.abortController.signal.aborted) {
      return;
    }

    await this.reportLog(false);
    await this.reportState();

    this.daemonTimer = setTimeout(() => this.runDaemon(), 1000);
  }

  /**
   * 记录日志
   *
   * @param format
   * @param a
   */
  log(format: string, ...meta: any[]): void {
    this.logRows.push(
      create(LogRowSchema, {
        time: timestampFromDate(new Date()),
        content: util.format(format, ...meta),
      }),
    );
  }

  setOutputs(outputs: Map<string, string>): void {
    outputs.forEach((value, key) => {
      if (key.length > 255) {
        logger.warn(`Ignore output because the key is too long: ${key}`);
        return;
      }
      if (value.length > 1024 * 1024) {
        logger.warn(`Ignore output because the value ${key} is too long: ${value.length}`);
        return;
      }
      if (this.outputs.has(key)) {
        return;
      }
      this.outputs.set(key, value);
    });
  }

  /**
   * 关闭报告器并报告最终状态
   * @param lastWords
   */
  async close(lastWords: string = 'Early termination') {
    this.closed = true;
    if (this.daemonTimer) {
      clearTimeout(this.daemonTimer);
    }

    if (this.state.result === Result.UNSPECIFIED) {
      // 更新所有未指定结果的步骤为已取消
      this.state.steps.map((step) => {
        if (step.result === Result.UNSPECIFIED) {
          step.result = Result.CANCELLED;
        }
        return step;
      });
      this.state.result = Result.FAILURE;

      // 添加最终日志行
      this.logRows.push(
        create(LogRowSchema, {
          time: timestampFromDate(new Date()),
          content: lastWords,
        }),
      );
      this.state.stoppedAt = timestampFromDate(new Date());
    } else if (lastWords !== '') {
      this.logRows.push(
        create(LogRowSchema, {
          time: timestampFromDate(new Date()),
          content: lastWords,
        }),
      );
    }

    // 尝试报告任务日志
    return retry(async () => {
      await this.reportLog(true);
      await this.reportState();
    });
  }

  /**
   * 上报任务日志
   * @param noMore
   */
  async reportLog(noMore: boolean) {
    return this.clientMutex.runExclusive(async () => {
      const request = create(UpdateLogRequestSchema, {
        taskId: this.state.id,
        index: this.logOffset,
        rows: this.logRows,
        noMore,
      });

      const updateLogResponse = await this.client.updateLog(request, { signal: this.abortController.signal });

      const { ackIndex } = updateLogResponse;
      if (ackIndex < this.logOffset) {
        throw new Error('Submitted logs are lost');
      }

      this.logRows = this.logRows.slice(Number(ackIndex - this.logOffset));
      this.logOffset = ackIndex;

      if (noMore && ackIndex < this.logOffset + BigInt(this.logRows.length)) {
        throw new Error('Not all logs are submitted');
      }
    });
  }

  /**
   * 上报任务状态
   */
  async reportState() {
    return this.clientMutex.runExclusive(async () => {
      const state = clone(TaskStateSchema, this.state);
      const outputs = Object.fromEntries(this.outputs);

      const request = create(UpdateTaskRequestSchema, { state, outputs });

      const updateTaskResponse = await this.client.updateTask(request, { signal: this.abortController.signal });
      if (!updateTaskResponse) {
        return;
      }

      updateTaskResponse.sentOutputs.forEach((key) => {
        this.outputs.set(key, '');
      });

      // 如果任务被取消
      if (updateTaskResponse.state && updateTaskResponse.state.result === Result.CANCELLED) {
        // this.close('Task canceled!');
        this.cancel();
      }

      const notSent: string[] = [];
      this.outputs.forEach((value, key) => {
        if (typeof value === 'string') {
          notSent.push(key);
        }
      });

      if (notSent.length > 0) {
        logger.info(`There are still outputs that have not been sent: ${notSent}`);
      }
    });
  }

  /**
   * 检查是否在步骤执行期间的逻辑
   */
  duringSteps(): boolean {
    const steps = this.state.steps;
    // 如果没有步骤，那么肯定不是在步骤处理阶段
    if (steps.length === 0) {
      return false;
    }

    // 获取第一个和最后一个步骤的状态
    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];

    if (firstStep.result === Result.UNSPECIFIED && firstStep.logLength === BigInt(0)) {
      return false;
    }

    if (lastStep.result !== Result.UNSPECIFIED) {
      return false;
    }

    return true;
  }

  public cancel(reason?: string): void {
    if (this.abortController.signal.aborted) return;
    this.abortController.abort(reason ?? 'Reporter cancelled');
  }

  static parseResult(result: any): Result {
    // 解析结果字符串的逻辑
    let str = '';
    if (typeof result === 'string') {
      str = result;
    } else if (result && typeof result.toString === 'function') {
      str = result.toString();
    }
    return stringToResult[str];
  }

  /**
   * 解析日志行的逻辑
   *
   * @param entry
   */
  parseLogRow(entry: LogEntry) {
    let content = (entry.message as string).replace(/\r|\n$/g, '');

    return create(LogRowSchema, {
      time: timestampFromDate(new Date(entry.timestamp)),
      content,
    });
  }
}

export default Reporter;
