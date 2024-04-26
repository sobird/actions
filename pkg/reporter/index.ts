/**
 * index.ts
 *
 * sobird<i@sobird.me> at 2024/04/26 0:19:33 created.
 */
import { Timestamp } from '@bufbuild/protobuf';
import retry from 'retry';
import log4js from 'log4js';
import type { Client } from '@/pkg';
import {
  Task, TaskState, StepState, Result, UpdateTaskRequest, UpdateLogRequest,
} from '@/pkg/client/runner/v1/messages_pb';
import { Replacer } from '@/utils';

const logger = log4js.getLogger();
logger.level = 'info';

const stringToResult = {
  success: Result.SUCCESS,
  failure: Result.FAILURE,
  skipped: Result.SKIPPED,
  cancelled: Result.CANCELLED,
};

class Reporter {
  private logReplacer = new Replacer();

  private state: TaskState; // 需要具体的类型定义

  private outputs = new Map<string, string>();

  private debugOutputEnabled: boolean;

  private stopCommandEndToken: string;

  private logOffset: bigint;

  private logRows: LogRow[];

  private closed: boolean;

  constructor(public client: typeof Client.prototype.RunnerServiceClient, public task: Task, public cancel: () => void) {
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
   * 处理日志条目并更新任务状态的逻辑
   * @param entry
   */
  fire(entry: any) {
    try {
      // 检查是否在步骤执行期间
      if (!this.duringSteps()) {
        // 如果不是，将日志行添加到日志行列表中
        const logRow = this.parseLogRow(entry);
        if (logRow) {
          this.logRows.push(logRow);
        }
      }

      // 更新任务状态
      const { stage } = entry.data;

      if (stage === 'Main') {
        // 如果是主阶段，检查是否有步骤结果，并更新步骤状态
        const { stepNumber } = entry.data;
        if (stepNumber !== undefined) {
          const step = this.findStepByNumber(stepNumber);
          if (step) {
            const stepResult = this.parseResult(entry.data.stepResult);
            if (stepResult) {
              step.result = stepResult;
              step.stoppedAt = Timestamp.fromDate(new Date());
            }
          }
        }
      }

      // 如果是作业结果，更新任务结果
      const { jobResult } = entry.data;
      if (jobResult !== undefined) {
        const result = this.parseResult(jobResult);
        if (result) {
          this.state.result = result;
          this.state.stoppedAt = Timestamp.fromDate(new Date());
          // 更新所有未指定结果的步骤的状态为取消
          this.state.steps.forEach((step) => {
            if (step.result === 'UNSPECIFIED') {
              step.result = 'CANCELLED';
            }
          });
        }
      }
    } finally {
      // 解锁
    }
  }

  runDaemon(): void {
    // 定期报告日志和状态的逻辑
  }

  logf(format: string, a: any): void {
    // 记录日志的逻辑
  }

  setOutputs(outputs: Map<string, string>): void {
    outputs.forEach(([key, value]) => {
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
        this.state.steps.forEach((step) => {
          if (step.result === Result.UNSPECIFIED) {
            step.result = Result.CANCELLED;
          }
        });
        this.state.result = Result.FAILURE;

        // 添加最终日志行
        this.logRows.push({
          time: Timestamp.fromDate(new Date()),
          content: lastWords,
        });
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
      console.error('Failed to report logs and state:', error);
    }
  }

  async retryReportLog() {
    const operation = retry.operation();

    operation.attempt(async () => {
      const logError = await this.reportLog(true);

      if (operation.retry(logError as any)) {
        return;
      }
      throw operation.mainError();
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
    try {
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
    } finally {
      // todo
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

  parseResult(result: any) {
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
  handleCommand(originalContent: string, command: string, parameters: string, value: string): string | null {
    if (this.stopCommandEndToken !== '' && command !== this.stopCommandEndToken) {
      return originalContent;
    }

    switch (command) {
      case 'add-mask':
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
      case 'warning':
      case 'error':
      case 'group':
      case 'endgroup':
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
  parseLogRow(entry: any): any { // 需要具体的 LogRow 类型
    const cmdRegex = /^::([^ :]+)( .*)?::(.*)$/;
    let content = entry.Message.replace(/\r|\n$/g, '');

    const matches = cmdRegex.exec(content);
    if (matches) {
      // matches[1] 是第一个捕获组，matches[2] 是第二个捕获组，以此类推
      const output = this.handleCommand(content, matches[1], matches[2], matches[3]);
      if (output) {
        content = output;
      } else {
        return null;
      }
    }

    content = this.logReplacer.replace(content);

    // 假设 entry.Time 是一个时间字符串，我们将其转换为 Date 对象
    const time = new Date(entry.Time);

    return {
      Time: time,
      Content: content,
    };
  }

  /**
   * 添加掩码
   * @param mask
   */
  addMask(mask: string): void {
    this.logReplacer.add(mask, '***');
  }
}

// 使用示例
const reporter = new Reporter(cancel, client, task);
reporter.logf('Hello, %s!', 'world');
