// actions.test.ts
import { describe, it, expect } from 'vitest';

import { Result } from '@/gen/runner/v1/messages_pb';

import { Status } from './status'; // 根据实际导入路径调整

// 假设你的 Status 是类版本
describe('Status', () => {
  describe('asResult', () => {
    const cases = [
      { status: Status.Unknown, want: Result.UNSPECIFIED },
      { status: Status.Waiting, want: Result.UNSPECIFIED },
      { status: Status.Running, want: Result.UNSPECIFIED },
      { status: Status.Blocked, want: Result.UNSPECIFIED },
      { status: Status.Success, want: Result.SUCCESS },
      { status: Status.Failure, want: Result.FAILURE },
      { status: Status.Cancelled, want: Result.CANCELLED },
      { status: Status.Cancelling, want: Result.CANCELLED },
      { status: Status.Skipped, want: Result.SKIPPED },
    ];

    cases.forEach(({ status, want }) => {
      it(`should convert ${status.toString()} to ${want}`, () => {
        expect(status.asResult()).toBe(want);
      });
    });
  });

  describe('fromResult', () => {
    const cases = [
      { result: Result.UNSPECIFIED, want: Status.Unknown },
      { result: Result.SUCCESS, want: Status.Success },
      { result: Result.FAILURE, want: Status.Failure },
      { result: Result.CANCELLED, want: Status.Cancelled },
      { result: Result.SKIPPED, want: Status.Skipped },
    ];

    cases.forEach(({ result, want }) => {
      it(`should convert ${result} to ${want.toString()}`, () => {
        expect(Status.fromResult(result)).toBe(want);
      });
    });
  });

  describe('AggregateJobStatus', () => {
    // 辅助函数：创建模拟的 Job 对象
    function createJob(status: Status, continueOnError: boolean): ActionRunJob {
      return {
        status,
        continueOnError,
        // 其他必需的属性可以添加默认值
      } as ActionRunJob;
    }

    const testCases = [
      {
        name: 'all success',
        jobs: [createJob(Status.Success, false), createJob(Status.Success, false)],
        want: Status.Success,
      },
      {
        name: 'one failure without continue-on-error',
        jobs: [createJob(Status.Success, false), createJob(Status.Failure, false)],
        want: Status.Failure,
      },
      {
        name: 'one failure with continue-on-error',
        jobs: [createJob(Status.Success, false), createJob(Status.Failure, true)],
        want: Status.Success,
      },
      {
        name: 'only continued-failure',
        jobs: [createJob(Status.Failure, true)],
        want: Status.Success,
      },
      {
        name: 'continued-failure plus real failure',
        jobs: [createJob(Status.Failure, true), createJob(Status.Failure, false)],
        want: Status.Failure,
      },
      {
        name: 'all skipped',
        jobs: [createJob(Status.Skipped, false), createJob(Status.Skipped, false)],
        want: Status.Skipped,
      },
      {
        name: 'continued-failure plus skipped counts as success',
        jobs: [createJob(Status.Failure, true), createJob(Status.Skipped, false)],
        want: Status.Success,
      },
    ];

    testCases.forEach(({ name, jobs, want }) => {
      it(name, () => {
        expect(aggregateJobStatus(jobs)).toBe(want);
      });
    });
  });
});

// 类型定义
export interface ActionRunJob {
  status: Status;
  continueOnError: boolean;
  // 其他属性...
}

// 实现 AggregateJobStatus 函数（需要实现）
export function aggregateJobStatus(jobs: ActionRunJob[]): Status {
  if (jobs.length === 0) {
    return Status.Success;
  }

  let hasRealFailure = false;
  let hasContinuedFailure = false;
  let allSkipped = true;

  for (const job of jobs) {
    if (job.status === Status.Skipped) {
      continue;
    }
    allSkipped = false;

    if (job.status === Status.Failure) {
      if (job.continueOnError) {
        hasContinuedFailure = true;
      } else {
        hasRealFailure = true;
      }
    }

    if (job.status === Status.Cancelled) {
      // 根据实际业务逻辑处理
      return Status.Cancelled;
    }
  }

  if (allSkipped) {
    return Status.Skipped;
  }

  if (hasRealFailure) {
    return Status.Failure;
  }

  if (hasContinuedFailure) {
    return Status.Success;
  }

  return Status.Success;
}
