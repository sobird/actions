/**
 * index.ts
 *
 * sobird<i@sobird.me> at 2024/04/26 0:19:33 created.
 */
import util from 'node:util';
import { Timestamp } from '@bufbuild/protobuf';
import retry from 'retry';
import log4js, { LoggingEvent } from 'log4js';
import type { Client } from '@/pkg';
import {
  LogRow, Task, TaskState, StepState, Result, UpdateTaskRequest, UpdateLogRequest,
} from '@/pkg/client/runner/v1/messages_pb';
import { Replacer } from '@/utils';

const logger = log4js.getLogger();

logger.level = 'info';

const stringToResult: any = {
  success: Result.SUCCESS,
  failure: Result.FAILURE,
  skipped: Result.SKIPPED,
  cancelled: Result.CANCELLED,
};

class Reporter {
  private logReplacer = new Replacer();

  private state: TaskState; // 需要具体的类型定义

  private outputs = new Map<string, string>();

  public debugOutputEnabled = false;

  private stopCommandEndToken = '';

  private logOffset = BigInt(0);

  private logRows = <LogRow[]>[];

  private closed = false;

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public task: Task = new Task(),
    public cancel = () => {},
  ) {
    ['token', 'gitea_runtime_token'].forEach((key) => {
      const value = task.context?.fields[key].toJsonString();
      if (value) {
        this.logReplacer.add(value, '***');
      }
    });

    Object.entries(task.secrets).forEach(([, value]) => {
      this.logReplacer.add(value, '***');
    });

    this.state = new TaskState({
      id: task.id,
    });

    if (task.secrets.ACTIONS_STEP_DEBUG === 'true') {
      this.debugOutputEnabled = true;
    }
  }

  /**
   * 重置步骤
   * @todo
   * 实现 mutex
   * @param l
   */
  resetSteps(l: number): void {
    try {
      // 清除现有的步骤状态
      this.state.steps = [];

      // 创建新的 StepState 对象并添加到 steps 数组中
      for (let i = 0; i < l; i++) {
        const step = new StepState({
          id: BigInt(i),
        });
        this.state.steps.push(step);
      }
    } finally {
      // 解锁
      // stateMu.unlock();
    }
  }

  /**
   * 用于在日志条目被创建时执行额外的操作。
   * 该方法更新了任务状态，处理了日志行，并在必要时更新了步骤信息
   * @param entry
   */
  fire(entry: LoggingEvent) {
    try {
      // 使用提供的日志条目
      logger.trace(entry.data);

      const timestamp = Timestamp.fromDate(entry.startTime);
      if (!this.state.startedAt) {
        this.state.startedAt = timestamp;
      }

      // 更新任务状态
      const { stage } = entry.context;
      if (stage !== 'Main') {
        // 处理作业结果
        const jobResult = Reporter.parseResult(entry.context.jobResult);
        if (jobResult !== undefined) {
          this.state.result = jobResult;
          this.state.stoppedAt = timestamp;
          this.state.steps.map((item) => {
            const step = item;
            if (step.result === Result.UNSPECIFIED) {
              step.result = Result.UNSPECIFIED;
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
      const { stepNumber } = entry.context;
      if (Number.isInteger(parseInt(stepNumber, 10)) && this.state.steps.length > stepNumber) {
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

      const rawOutput = entry.context.raw_output;
      if (rawOutput) {
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
      const stepResult = Reporter.parseResult(entry.context.stepResult);
      if (stepResult !== undefined && step) {
        if (step.logLength === BigInt(0)) {
          step.logIndex = this.logOffset + BigInt(this.logRows.length);
        }
        step.result = stepResult;
        step.stoppedAt = timestamp;
      }
    } finally {
      // 解锁
    }
  }

  async runDaemon() {
    if (this.closed) {
      return;
    }
    // 检查上下文是否已取消
    // if (this.context.isCancelled()) {
    //   return;
    // }

    try {
      // 报告日志，但不标记为完成
      await this.reportLog(false);
      // 报告任务状态
      await this.reportState();
    } catch (error: any) {
      logger.error('Error running daemon:', error.message);
    }

    // 使用 setTimeout 来实现延迟执行
    setTimeout(() => { return this.runDaemon(); }, 1000);
  }

  /**
   * 记录日志
   *
   * @param format
   * @param a
   */
  log(format: string, ...a: any): void {
    this.logRows.push(new LogRow({
      time: Timestamp.fromDate(new Date()),
      content: util.format(format, ...a),
    }));
  }

  setOutputs(outputs: Map<string, string>): void {
    outputs.forEach((value, key) => {
      if (key.length > 255) {
        logger.warn('ignore output because the key is too long', key);
        return;
      }
      if (value.length > 1024 * 1024) {
        console.log(`ignore output because the value is too long: ${key}`, value.length);
        logger.warn(`ignore output because the value ${key} is too long: ${value.length}`);
        return;
      }
      // 检查是否已经存储了该输出
      if (this.outputs.has(key)) {
        return;
      }
      // 存储输出
      this.outputs.set(key, value);
    });
  }

  /**
   * 关闭报告器并报告最终状态
   * @param lastWords
   */
  async close(flag: string) {
    let lastWords = flag;
    try {
      this.closed = true;

      if (this.state.result === Result.UNSPECIFIED) {
        if (!lastWords) {
          lastWords = 'Early termination';
        }
        // 更新所有未指定结果的步骤为已取消
        this.state.steps.map((item) => {
          const step = item;
          if (step.result === Result.UNSPECIFIED) {
            step.result = Result.CANCELLED;
          }
          return step;
        });
        this.state.result = Result.FAILURE;

        // 添加最终日志行
        this.logRows.push(new LogRow({
          time: Timestamp.fromDate(new Date()),
          content: lastWords,
        }));
        this.state.startedAt = Timestamp.fromDate(new Date());
      } else if (lastWords) {
        // 添加额外的日志行
        this.logRows.push(new LogRow({
          time: Timestamp.fromDate(new Date()),
          content: lastWords,
        }));
      }
    } finally {
      // todo
    }

    // 尝试报告日志和状态
    try {
      await this.retryReportLog();
    } catch (error) {
      logger.error('Failed to report logs and state:', error);
    }
  }

  async retryReportLog() {
    const operation = retry.operation();

    operation.attempt(async () => {
      const logError = await this.reportLog(true);

      if (operation.retry(logError as any)) {
        return;
      }

      operation.mainError();
    });
  }

  /**
   * 上报日志
   * @param noMore
   */
  async reportLog(noMore: boolean): Promise<Error | void > {
    try {
      const rows = this.logRows;
      const updateLogResponse = await this.client.updateLog(new UpdateLogRequest({
        taskId: this.state.id,
        index: this.logOffset,
        rows,
        noMore,
      }));
      if (!updateLogResponse) {
        throw Error(updateLogResponse);
      }

      // 获取服务端确认的日志索引
      const { ackIndex } = updateLogResponse;
      if (ackIndex < this.logOffset) {
        throw new Error('submitted logs are lost');
      }

      // 更新日志偏移量和日志行
      this.logOffset = ackIndex;
      this.logRows = this.logRows.slice(Number(ackIndex - this.logOffset));

      if (noMore && ackIndex < this.logOffset + BigInt(rows.length)) {
        throw new Error('not all logs are submitted');
      }
    } finally {
      // todo
    }
  }

  /**
   * 报告状态
   */
  async reportState() {
    const state = this.state.clone();

    const outputs = Array.from(this.outputs).reduce((accu, [key, val]) => {
      accu[key] = val;
      return accu;
    }, {} as { [key: string]: string });

    const updateTaskResponse = await this.client.updateTask(new UpdateTaskRequest({ state, outputs }));
    if (!updateTaskResponse) {
      return;
    }

    updateTaskResponse.sentOutputs.forEach((outputKey) => {
      this.outputs.set(outputKey, '');
    });

    if (updateTaskResponse.state && updateTaskResponse.state.result === Result.CANCELLED) {
      this.cancel();
    }

    const notSent: string[] = [];
    this.outputs.forEach((value, key) => {
      if (!updateTaskResponse.sentOutputs.includes(key)) {
        notSent.push(key);
      }
    });

    if (notSent.length > 0) {
      throw Error(`there are still outputs that have not been sent: ${notSent}`);
    }
  }

  /**
   * 检查是否在步骤执行期间的逻辑
   */
  duringSteps(): boolean {
    // 如果没有步骤，那么肯定不是在步骤处理阶段
    if (this.state.steps.length === 0) {
      return false;
    }

    // 获取第一个和最后一个步骤的状态
    const firstStep = this.state.steps[0];
    const lastStep = this.state.steps[this.state.steps.length - 1];

    if (firstStep.result === Result.UNSPECIFIED && firstStep.logLength === BigInt(0)) {
      return false;
    }

    if (lastStep.result !== Result.UNSPECIFIED) {
      return false;
    }

    // 如果上述条件都不满足，那么当前是在步骤处理阶段
    return true;
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
   * 处理日志中的特定命令的逻辑
   *
   * @param originalContent
   * @param command
   * @param parameters
   * @param value
   */
  handleCommand(originalContent: string, command: string, parameters: string, value: string) {
    if (this.stopCommandEndToken !== '' && command !== this.stopCommandEndToken) {
      return originalContent;
    }

    switch (command) {
      case 'add-mask':
        /**
         * @todo
         * 此处逻辑可能有问题，这将会mask添加到实例全局
         */
        this.addMask(value);
        return null;
      case 'debug':
        if (this.debugOutputEnabled) {
          return value;
        }
        return null;
      // The following cases are placeholders for future implementation
      // and currently just return the original content.
      case 'notice':
        return originalContent;
      case 'warning':
        return originalContent;
      case 'error':
        return originalContent;
      case 'group':
        return originalContent;
      case 'endgroup':
        return originalContent;
      case 'stop-commands':
        this.stopCommandEndToken = value;
        return null;
      case this.stopCommandEndToken:
        this.stopCommandEndToken = '';
        return null;
      default:
        return originalContent;
    }
  }

  /**
   * 解析日志行的逻辑
   *
   * @todo
   * log.Entry
   * @param entry
   */
  parseLogRow(entry: LoggingEvent) {
    const cmdRegex = /^::([^ :]+)( .*)?::(.*)$/;
    let content = entry.data.join().replace(/\r|\n$/g, '');

    const matches = cmdRegex.exec(content);
    if (matches) {
      // matches[1] 是第一个捕获组，matches[2] 是第二个捕获组，以此类推
      const output = this.handleCommand(content, matches[1], matches[2], matches[3]);
      if (output) {
        content = output;
      } else {
        return;
      }
    }

    content = this.logReplacer.replace(content);

    return new LogRow({
      time: Timestamp.fromDate(entry.startTime),
      content,
    });
  }

  /**
   * 添加掩码
   * @param mask
   */
  addMask(mask: string): void {
    this.logReplacer.add(mask, '***');
  }
}

export default Reporter;

// 使用示例
// const reporter = new Reporter({} as any);
// const result = reporter.parseLogRow({
//   data: ["::notice file=file.name,line=42,endLine=48,title=Cool Title::Gosh, that's not going to work"],
//   startTime: new Date(),
// } as LoggingEvent);

// console.log('parseLogRow', result);

// reporter.runDaemon();
