/**
 * Status represents the status of ActionRun, ActionRunJob, ActionTask, or ActionTaskStep
 *
 * sobird<i@sobird.me> at 2024/12/01 21:08:55 created.
 */

import { Result } from '@/gen/runner/v1/messages_pb';

export type StatusValue =
  | 'unknown'
  | 'waiting'
  | 'running'
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'cancelling'
  | 'skipped'
  | 'blocked';

export class Status {
  static readonly Unknown = new Status('unknown');
  static readonly Waiting = new Status('waiting');
  static readonly Running = new Status('running');
  static readonly Success = new Status('success');
  static readonly Failure = new Status('failure');
  static readonly Cancelled = new Status('cancelled');
  static readonly Cancelling = new Status('cancelling');
  static readonly Skipped = new Status('skipped');
  static readonly Blocked = new Status('blocked');

  static readonly #values: readonly Status[] = [
    Status.Unknown,
    Status.Waiting,
    Status.Running,
    Status.Success,
    Status.Failure,
    Status.Cancelled,
    Status.Cancelling,
    Status.Skipped,
    Status.Blocked,
  ];

  static readonly #byValue = new Map<string, Status>(this.#values.map((s) => [s.value, s]));

  private constructor(public readonly value: StatusValue) {}

  // String returns the string name of the Status
  toString() {
    return this.value;
  }

  // LocaleString returns the locale string name of the Status
  toLocaleString(translate: (key: string) => string): string {
    return translate(`actions.status.${this.value}`);
  }

  isUnknown() {
    return this === Status.Unknown;
  }

  isSuccess() {
    return this === Status.Success;
  }

  isFailure() {
    return this === Status.Failure;
  }

  isCancelled() {
    return this === Status.Cancelled;
  }

  isSkipped() {
    return this === Status.Skipped;
  }

  isWaiting() {
    return this === Status.Waiting;
  }

  isRunning() {
    return this === Status.Running;
  }

  isBlocked() {
    return this === Status.Blocked;
  }

  isCancelling() {
    return this === Status.Cancelling;
  }

  in(...statuses: Status[]) {
    return statuses.includes(this);
  }

  // isDone returns whether the Status is final
  isDone() {
    return this.in(Status.Success, Status.Failure, Status.Cancelled, Status.Skipped);
  }

  // HasRun returns whether the Status is a result of running
  hasRun(): boolean {
    return this.in(Status.Success, Status.Failure);
  }

  toResult() {
    if (this === Status.Success) {
      return Result.SUCCESS;
    }
    if (this === Status.Failure) {
      return Result.FAILURE;
    }
    if (this === Status.Cancelled || this === Status.Cancelling) {
      return Result.CANCELLED;
    }
    if (this === Status.Skipped) {
      return Result.SKIPPED;
    }
    return Result.UNSPECIFIED;
  }

  static fromResult(result: Result) {
    switch (result) {
      case Result.SUCCESS:
        return Status.Success;
      case Result.FAILURE:
        return Status.Failure;
      case Result.CANCELLED:
        return Status.Cancelled;
      case Result.SKIPPED:
        return Status.Skipped;
      default:
        return Status.Unknown;
    }
  }

  /**
   * 合并两个 Result，取更差者
   *
   * 依赖枚举值本身的大小序：UNSPECIFIED(0) < SUCCESS(1) < FAILURE(2) < CANCELLED(3) < SKIPPED(4)
   * 与上游 TaskResultUtil.MergeTaskResults 的取最差语义一致
   */
  static mergeResults(current: Result, coming: Result): Result {
    return coming > current ? coming : current;
  }

  static values() {
    return this.#values;
  }

  static names() {
    return this.values().map((item) => item.value);
  }

  static from(status?: string) {
    if (!status) {
      return Status.Unknown;
    }
    return this.#byValue.get(status) ?? Status.Unknown;
  }
}
